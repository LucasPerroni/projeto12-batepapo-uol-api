import express from "express"
import cors from "cors"
import chalk from "chalk"
import dayjs from "dayjs"

const app = express()
app.use(express.json())
app.use(cors())

const participants = []
const messages = []

//  /participants
app.get("/participants", (req, res) => {
  res.send(participants)
})

app.post("/participants", (req, res) => {
  const { name } = req.body
  const nameExistent = participants.find((p) => p.name === name)

  if (!name) {
    res.status(422).send("Name must be filled")
    return
  }

  if (nameExistent) {
    res.status(409).send("This name is already being used")
    return
  }

  const time = dayjs().format("HH:mm:ss")

  // add new participant
  participants.push({
    name,
    lastStatus: Date.now(),
  })

  // add new message to chat
  messages.push({
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time,
  })

  res.sendStatus(201)
})

//  /messages
app.get("/messages", (req, res) => {
  res.send("OK")
})

app.post("/messages", (req, res) => {
  res.send("OK")
})

//  /status
app.post("/status", (req, res) => {
  res.send("OK")
})

//  listen
app.listen(5000, () => {
  console.log(chalk.bold.greenBright("Express running"))
})
