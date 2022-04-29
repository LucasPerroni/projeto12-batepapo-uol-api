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
    const db = client.db(process.env.MONGO_DB)
    const participants = await db.collection("participants").find({}).toArray()

    res.send(participants)
  } catch (e) {
    res.sendStatus(500)
  }
})

app.post("/participants", async (req, res) => {
  try {
    await client.connect()
    const db = client.db(process.env.MONGO_DB)

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
app.get("/messages/", async (req, res) => {
  try {
    await client.connect()
    const db = client.db(process.env.MONGO_DB)

    const messages = await db.collection("messages").find({}).toArray()
    const newMessages = []

    // get limit of messages
    let { limit } = req.query
    if (!limit) {
      limit = messages.length
    }

    // filter messages
    const { user } = req.headers
    messages.forEach((message) => {
      if (message.type !== "private_message" || message.to === user || message.from === user) {
        newMessages.push(message)
      }
    })

    res.send(newMessages.slice(-parseInt(limit)))
  } catch (e) {
    console.log("deu ruim no get message")
    res.sendStatus(500)
  }
})

app.post("/messages", async (req, res) => {
  try {
    await client.connect()
    const db = client.db(process.env.MONGO_DB)

    // get user data from body and headers
    const { to, text, type } = req.body
    const { user } = req.headers

    // validate if "user" is in "participants" array
    const participants = await db.collection("participants").find({}).toArray()
    const participant = participants.filter((p) => p.name === user)

    // validate data
    if (
      !to ||
      !text ||
      (type !== "message" && type !== "private_message") ||
      participant.length === 0
    ) {
      res.sendStatus(422)
      return
    }

    // push new message to array in MongoDB
    const time = dayjs().format("HH:mm:ss")
    await db.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time,
    })

    res.sendStatus(201)
  } catch (e) {
    res.sendStatus(500)
  } finally {
    client.close()
  }
})

//  /status
app.post("/status", async (req, res) => {
  try {
    await client.connect()
    const db = client.db(process.env.MONGO_DB)
    const { user } = req.headers

    // validate if participant is active
    const participant = await db.collection("participants").findOne({ name: user })
    if (!participant) {
      res.sendStatus(404)
      return
    }

    // update lastStatus in participant obj
    await db
      .collection("participants")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } })

    res.sendStatus(200)
  } catch (e) {
    // console.log(e)
    res.status(500).send(e)
  } finally {
    client.close()
  }
})

//  listen
app.listen(5000, () => {
  console.log(chalk.bold.greenBright("Express running"))
})
