const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const jwt = require('jsonwebtoken')

app.use(cors())
app.use(express.json())
const port = process.env.PORT || 5000
app.get('/', (req, res) => {
  res.send('genius car server is running..')
})
app.listen(port, () => {
  console.log(`server is rinning ${port}`)
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dnw37y6.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
})

async function run() {
  try {
    const servicesCollection = client.db('geniusCarDB').collection('services')
    const ordersCollection = client.db('geniusCarDB').collection('orders')
    app.get('/services', async (req, res) => {
      const query = {}
      const cursor = servicesCollection.find(query)
      const services = await cursor.toArray()
      res.send(services)
    })
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const service = await servicesCollection.findOne(query)
      res.send(service)
    })

    //token
    function verifyJWT(req, res, next) {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).send('Unauthorized Access')
      }
      const token = authHeader.split(' ')[1]
      jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        function (err, decoded) {
          if (err) {
            return res.status(403).send('Forbidden Access')
          }
          req.decoded = decoded
          next()
        }
      )
    }

    app.post('/jwt', (req, res) => {
      const user = req.body
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '2d',
      })
      res.send({ token })
    })

    // orders
    app.get('/orders', verifyJWT, async (req, res) => {
      const decoded = req.decoded
      if (decoded.email !== req.query.email) {
        res.status(403).send('Forbidden Access')
      }
      let query = {}
      if (req.query.email) {
        query = {
          email: req.query.email,
        }
      }
      const cursor = ordersCollection.find(query)
      const orders = await cursor.toArray()
      res.send(orders)
    })
    app.post('/orders', verifyJWT, async (req, res) => {
      const order = req.body
      const result = await ordersCollection.insertOne(order)
      res.send(result)
    })
    app.delete('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const result = await ordersCollection.deleteOne(query)
      res.send(result)
    })
    app.patch('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const status = req.body.status
      const query = { _id: ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: status,
        },
      }
      const result = await ordersCollection.updateOne(query, updatedDoc)
      res.send(result)
    })
  } finally {
  }
}
run().catch(console.dir)
