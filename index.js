const express = require('express');
const app=express();
const  jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const port=process.env.PORT||5000;
// DB_USER=bossuser
// DB_PASS=cwbKfVaM9t17F6SQ
// middleware
app.use(cors());
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
    await client.connect();
    const userCollection=client.db('bistroDb').collection("user")
    const menuCollection=client.db('bistroDb').collection("menu")
    const reviewCollection=client.db('bistroDb').collection("review")
    const cartsCollection=client.db('bistroDb').collection("cart")



    // first part
  //  menu data get
    app.get("/menu",async(req,res)=>{
        const result=await menuCollection.find().toArray();
        res.send(result)
    })
    app.post('/menu',verifytoken,verifyAdmin,async(req,res)=>{
      const item=req.body;
      const result=await menuCollection.insertOne(item);
      res.send(result)
    })
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
// second part
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
// menu related apis user delete
 app.delete('/user/:id',verifytoken,verifyAdmin,async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await userCollection.deleteOne(query);
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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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