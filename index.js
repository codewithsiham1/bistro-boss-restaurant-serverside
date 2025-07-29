const express = require('express');
const app=express();
const  jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()

const stripe=require('stripe')(process.env.STRIPE_TOKEN_SECRET)
const port=process.env.PORT||5000;
// DB_USER=bossuser
// DB_PASS=cwbKfVaM9t17F6SQ
// middleware
// Correct CORS options
const corsOption = {
  origin: [
    'http://localhost:5173', // for local dev
    'https://resshop-a427b.web.app' // for deployed frontend
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOption));
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.leope.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection=client.db('bistroDb').collection("user")
    const menuCollection=client.db('bistroDb').collection("menu")
    const reviewCollection=client.db('bistroDb').collection("review")
    const cartsCollection=client.db('bistroDb').collection("cart")
    const paymentCollection=client.db('bistroDb').collection("payments")
    const contactCollection=client.db('bistroDb').collection("contact")


  
    // midlewares 
    const   verifytoken=(req,res,next)=>{
    console.log('inside  verifytoken',req.headers.authorization)
    if(!req.headers.authorization){
      return res.status(401).send({message:"Forbidden Access"})
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
      if(err){
        return res.status(401).send({message:'forbidden access'})
      }
      req.decoded=decoded;
      next()
    })
    }
    //  j request dissay sai admin ki na seta check korbo
    // use verifu admin after verify token
    const verifyAdmin=async(req,res,next)=>{
    const email=req.decoded.email;
    const query={email:email};
    const user=await userCollection.findOne(query);
    const isAdmin=user?.role==='admin';
    if(!isAdmin){
      return res.status(403).send({message:'forBidden access'})
    }
    next()
    }
    
    // user backend thakay collect koray show
    // user related api
    app.get("/user", verifytoken,verifyAdmin,async(req,res)=>{
      
      const result=await userCollection.find().toArray()
      res.send(result);
    })


    // first part
  //  menu data get
    app.get("/menu",async(req,res)=>{
        const result=await menuCollection.find().toArray();
        res.send(result)
    })
    // add item ar cart gula menu item a ad
    app.post('/menu',verifytoken,verifyAdmin,async(req,res)=>{
      const item=req.body;
      const result=await menuCollection.insertOne(item);
      res.send(result)
    })
    // manage all item thakay menu ar data delete
    app.delete("/menu/:id",verifytoken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result= await menuCollection.deleteOne(query);
      res.send(result)
    })
    // manage all item update
    app.get('/menu/:id',verifytoken,verifyAdmin,async(req,res)=>{
 const id=req.params.id;
 const query={_id:new ObjectId(id)}
  const result=await menuCollection.findOne(query)
  res.send(result)
  
    })
    // PUT /menu/:id
app.put('/menu/:id', async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;
  const result = await menuCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );
  res.send(result);
});
    // review data get
    app.get("/review",async(req,res)=>{
        const result=await reviewCollection.find().toArray();
        res.send(result)
    })
    // cart collection
    app.post("/cart",async(req,res)=>{
      const cartItem=req.body;
      const result=await cartsCollection.insertOne(cartItem)
      res.send(result);
    })
  //  data get
  app.get("/cart",async(req,res)=>{
    const email=req.query.email;
    const query={email:email}
    const result=await cartsCollection.find(query).toArray();
    res.send(result);
  })
// cart thakay data delete
app.delete("/cart/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await cartsCollection.deleteOne(query);
  res.send(result)
})
// user related api

app.post("/user",async(req,res)=>{

  const user=req.body;
  // insert email if user doesnt exists
  // you can do this in manay ways(i,email unique 2.upsert 3.simple checking)
   const query={email:user.email}
   const existingUser=await userCollection.findOne(query)
   if(existingUser){
    return res.send({message:"user already exists",insertedId:null})
   }
  const result=await userCollection.insertOne(user);
  res.send(result)
})


// menu related apis user delete
 app.delete('/user/:id',verifytoken,verifyAdmin,async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await userCollection.deleteOne(query);
  res.send(result)
 })
//   contact us thakay data patabo
app.post("/contact",async(req,res)=>{
  const contactItem=req.body;
 const result=await contactCollection.insertOne(contactItem);
 res.send(result);
})
// contact use ar data manage booking a get korbo
app.get("/contact",async(req,res)=>{
  const result=await contactCollection.find().toArray();
  res.send(result)
})
//  admin ar jonno backend a api create
app.patch("/user/admin/:id",verifytoken,verifyAdmin,async(req,res)=>{
const id=req.params.id;
const filter={_id:new ObjectId(id)}
const updatedDoc={
  $set:{
    role:"admin"
  }
}
const result=await userCollection.updateOne(filter,updatedDoc)
res.send(result)
})

// jwt related api created
app.post("/jwt",async(req,res)=>{
   const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  res.send({token})
})
// admin secure ar jonno api create
app.get('/user/admin/:email',verifytoken,async(req,res)=>{
const email=req.params.email;
if(email !==req.decoded.email){
  return res.status(403).send({message:'unauthorized access'})
}
const query={email:email}
const user=await userCollection.findOne(query);
let admin=false
if(user){
  admin=user?.role==='admin';
}
res.send({admin});
});
//  payment intend
app.post('/create-checkout-session',async(req,res)=>{
  const {price}=req.body;
  const amount=parseInt(price*100);
  const paymentIntent=await stripe.paymentIntents.create({
    amount:amount,
    currency:"usd",
    payment_method_types:['card']
  })
  res.send({
    clientSecret:paymentIntent.client_secret
  })
})
// payment related api
app.post('/payments',async(req,res)=>{
  const payment=req.body;
  const paymentresult=await paymentCollection.insertOne(payment)
  // carefully delete each item for the cart
  console.log("payment Info",payment)
  const query = { _id: { $in: payment.cardId.map(id =>new ObjectId(id)) } }
  const deleteresult=await cartsCollection.deleteMany(query);
  res.send({paymentresult},deleteresult)

})
// payment history gate
app.get('/payments/:email',verifytoken,async(req,res)=>{
  const query={email:req.params.email}
  if(req.params.email !==req.decoded.email){
    return res.status(403).send({message:"Forbidden Access"})
  }
  const result=await paymentCollection.find(query).toArray();
  res.send(result)
})
// stats or analytics
app.get("/admin-states",verifytoken,verifyAdmin,async(req,res)=>{
  const users=await userCollection.estimatedDocumentCount();
  const menuItems=await menuCollection.estimatedDocumentCount();
  const orders=await paymentCollection.estimatedDocumentCount();
  // this is not the best way
  // const payments=await paymentCollection.find().toArray();
  // const rvenue=payments.reduce((total,payment)=>total+payment.price,0);
  // other option
  const result=await paymentCollection.aggregate([
    {
      $group:{
        _id:null,
        totalRevenue:{
          $sum:'$price'
        }
      }
    }
  ]).toArray();
  const revenue=result.length >0 ? result[0].totalRevenue:0;
  res.send({
    users,menuItems,orders,revenue
  })
})
// using aggregate pipeline
app.get("/order-stats",verifytoken,verifyAdmin, async (req, res) => {
  const result = await paymentCollection.aggregate([
    {
      $unwind: '$menuIdItem'
    },
    {
      $lookup: {
        from: 'menu',
        localField: 'menuIdItem',
        foreignField: '_id',
        as: 'menuItems'
      }
    },
    {
      $unwind: '$menuItems'
    },
    {
      $group: {
        _id: '$menuItems.category',
        quantity: { $sum: 1 },
        revenue: { $sum: '$menuItems.price' }
      }
    },
    {
      $project:{
        _id:0,
        category:'$_id',
        quantity:'$quantity',
        revenue:"$revenue"
      }
    }
  ]).toArray();

  res.send(result);
});

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/",(req,res)=>{
    res.send('bistro boss server running')
})
app.listen(port,()=>{
    console.log(`bistro boss request to jonin:${port}`)
})