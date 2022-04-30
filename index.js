import express from "express"
import cors from "cors"
import chalk from "chalk"
import dayjs from "dayjs"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import joi from "joi"

dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())

let db
const client = new MongoClient(process.env.MONGO_URI)
const promisse = client.connect()
promisse.then(() => {
  db = client.db(process.env.MONGO_DB)
  setInterval(updateParticipants, 15000)
})
promisse.catch((e) => {
  console.log(chalk.bold.redBright(`Error in client.connect:`, e))
})

//  /participants
app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find({}).toArray()
    res.send(participants)
  } catch (e) {
    res.sendStatus(500)
  }
})

app.post("/participants", async (req, res) => {
  try {
    const { name } = req.body
    const nameExistent = await db.collection("participants").find({ name: name }).toArray()

    // validate if name has been filled
    const participantSchema = joi.object({
      name: joi.string().required(),
    })
    const validation = participantSchema.validate(req.body)
    if (validation.error) {
      res.status(422).send(validation.error.details.map((e) => e.message))
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
  }
})

//  /messages
app.get("/messages/", async (req, res) => {
  try {
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
    res.sendStatus(500)
  }
})

app.post("/messages", async (req, res) => {
  try {
    // get user data from body and headers
    const { to, text, type } = req.body
    const { user } = req.headers

    // validate if "user" is in "participants" array
    const participant = await db.collection("participants").findOne({ name: user })
    if (!participant) {
      res.status(422).send("this participant isn't online")
      return
    }

    // validate data
    const messageSchema = joi.object({
      to: joi.string().required(),
      text: joi.string().required(),
      type: joi.string().required(),
    })
    const validation = messageSchema.validate(req.body, { abortEarly: false })
    if (validation.error) {
      res.status(422).send(validation.error.details.map((e) => e.message))
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
  }
})

//  /status
app.post("/status", async (req, res) => {
  try {
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
    res.status(500).send(e)
  }
})

//  listen
app.listen(5000, () => {
  console.log(chalk.bold.greenBright("Express running"))
})

async function updateParticipants() {
  try {
    const participants = await db.collection("participants").find({}).toArray()

    const now = Date.now()
    const time = dayjs().format("HH:mm:ss")

    participants.forEach(async (p) => {
      // validate if participant were active in the last 10 seconds
      if (p.lastStatus < now - 10000) {
        await db.collection("participants").deleteOne({ name: p.name })
        await db.collection("messages").insertOne({
          from: p.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time,
        })
      }
    })
  } catch (e) {
    console.log(chalk.bold.redBright("Error to update participants", e))
  }
}
