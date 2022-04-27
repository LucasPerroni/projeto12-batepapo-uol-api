import express from "express"
import cors from "cors"
import chalk from "chalk"

const app = express()
app.use(express.json())
app.use(cors())

//  /participants
app.get("/participants", (req, res) => {
  res.send("OK")
})

app.post("/participants", (req, res) => {
  res.send("OK")
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
