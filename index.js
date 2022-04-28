import express from "express"
import cors from "cors"
import chalk from "chalk"
import dayjs from "dayjs"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"

dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())

const client = new MongoClient(process.env.MONGO_URL)

//  /participants
app.get("/participants", async (req, res) => {
  try {
    await client.connect()
    const db = client.db("projeto12")
    const participants = await db.collection("participants").find({}).toArray()

    res.send(participants)
  } catch (e) {
    res.sendStatus(500)
  } finally {
    client.close()
  }
})

app.post("/participants", async (req, res) => {
  try {
    await client.connect()
    const db = client.db("projeto12")

    const { name } = req.body
    const nameExistent = await db.collection("participants").find({ name: name }).toArray()

    // validate if name has been filled
    if (!name) {
      res.status(422).send("Name must be filled")
      return
    }

    // validate if name already exists
    if (nameExistent.length > 0) {
      res.status(409).send("This name is already being used")
      return
    }

    // push new user to "participants" array
    await db.collection("participants").insertOne({
      name,
      lastStatus: Date.now(),
    })

    // push new user to "messages" array
    const time = dayjs().format("HH:mm:ss")
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time,
    })

    res.sendStatus(201)
  } catch (e) {
    res.sendStatus(500)
  } finally {
    client.close()
  }
})

//  /messages
app.get("/messages", async (req, res) => {
  try {
    await client.connect()
    const db = client.db("projeto12")
    const messages = await db.collection("messages").find({}).toArray()

    res.send(messages)
  } catch (e) {
    res.sendStatus(500)
  } finally {
    client.close()
  }
})

app.post("/messages", async (req, res) => {
  res.send("OK")
})

//  /status
app.post("/status", async (req, res) => {
  res.send("OK")
})

//  listen
app.listen(5000, () => {
  console.log(chalk.bold.greenBright("Express running"))
})
