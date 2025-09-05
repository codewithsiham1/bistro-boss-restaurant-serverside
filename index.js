const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_TOKEN_SECRET);

// middleware
const corsOption = {
  origin: [
    "http://localhost:5173",
    "https://resshop-a427b.web.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOption));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.leope.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// async function to connect
async function run() {
  try {
    // await client.connect();

    const userCollection = client.db("bistroDb").collection("user");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("review");
    const cartsCollection = client.db("bistroDb").collection("cart");
    const paymentCollection = client.db("bistroDb").collection("payments");
    const contactCollection = client.db("bistroDb").collection("contact");

    // middlewares
    const verifytoken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbidden Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email });
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    // Routes

    app.get("/", (req, res) => {
      res.send("🚀 Bistro Boss server running on Vercel!");
    });

    app.get("/user", verifytoken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/user/:id", verifytoken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch("/user/admin/:id", verifytoken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: "admin" } }
      );
      res.send(result);
    });

    app.get("/user/admin/:email", verifytoken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const user = await userCollection.findOne({ email });
      res.send({ admin: user?.role === "admin" });
    });

    // menu
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.post("/menu", verifytoken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/menu/:id", verifytoken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await menuCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/menu/:id", verifytoken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await menuCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.put("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await menuCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    // reviews
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // cart
    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const result = await cartsCollection.find({ email }).toArray();
      res.send(result);
    });

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const result = await cartsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // contact
    app.post("/contact", async (req, res) => {
      const contactItem = req.body;
      const result = await contactCollection.insertOne(contactItem);
      res.send(result);
    });

    app.get("/contact", async (req, res) => {
      const result = await contactCollection.find().toArray();
      res.send(result);
    });

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // stripe payment intent
    app.post("/create-checkout-session", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payments
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      const query = { _id: { $in: payment.cardId.map(id => new ObjectId(id)) } };
      await cartsCollection.deleteMany(query);
      res.send(paymentResult);
    });

    app.get("/payments/:email", verifytoken, async (req, res) => {
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const result = await paymentCollection.find({ email: req.params.email }).toArray();
      res.send(result);
    });

    // stats
    app.get("/admin-stats", verifytoken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const menuItems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      const result = await paymentCollection.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: "$price" } } }
      ]).toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;
      res.send({ users, menuItems, orders, revenue });
    });

    app.get("/order-stats", verifytoken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.aggregate([
        { $unwind: "$menuIdItem" },
        {
          $lookup: {
            from: "menu",
            localField: "menuIdItem",
            foreignField: "_id",
            as: "menuItems",
          },
        },
        { $unwind: "$menuItems" },
        {
          $group: {
            _id: "$menuItems.category",
            quantity: { $sum: 1 },
            revenue: { $sum: "$menuItems.price" },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            quantity: "$quantity",
            revenue: "$revenue",
          },
        },
      ]).toArray();
      res.send(result);
    });

  } finally {
    // no client.close() here for serverless
  }
}
run().catch(console.dir);

// Export for Vercel
module.exports = app;
