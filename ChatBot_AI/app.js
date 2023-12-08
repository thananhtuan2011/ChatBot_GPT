import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import fs from "fs";
import dotenv from "dotenv";
import morgan from "morgan";
import multer from "multer";
import path from "path";
dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(morgan("combined"));
app.use(express.static('static'));
const apiKey = process.env.OPENAI_API_KEY;
console.log("apiKey", apiKey)
const openai = new OpenAI({ apiKey: apiKey });


let assistant_id;
// const blob = new Blob([fileContents], { type: 'text/plain' });

// // Set your desired filename and MIME type
// const fileName = 'test.txt';
// const fileMime = 'text/plain';

// // Create your File object
// const file = new File([blob], fileName, { type: fileMime });

// const upload = await openai.files.create({
//   file: file,
//   purpose: "assistants",
// })
// Create an Assistant

async function createAssistant() {
  const upload = await openai.files.create(
    {
      file: fs.createReadStream("DPS.txt"),
      purpose: 'assistants'
    }

  )
  console.log("uploadid", upload.id)
  const assistantResponse = await openai.beta.assistants.create({
    name: "DPS company", // adjust name as per requirement
    instructions: "ChatBot AI DPS",
    tools: [{ type: "retrieval" }],
    file_ids: [upload.id], // adjust tools as per requirement
    model: "gpt-3.5-turbo-1106", // or any other GPT-3.5 or GPT-4 model
  });
  assistant_id = assistantResponse.id;
  console.log(`Assistant ID: ${assistant_id}`);
}

createAssistant();
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
});

// Endpoint to handle chat
app.post("/chat", async (req, res) => {
  try {
    if (!req.body.message) {
      return res.status(400).json({ error: "Message field is required" });
    }
    const userMessage = req.body.message;

    // Create a Thread
    const threadResponse = await openai.beta.threads.create();
    const threadId = threadResponse.id;

    // Add a Message to a Thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: userMessage,
    });

    console.log(`Assistant ID 2: ${assistant_id}`);
    // Run the Assistant
    const runResponse = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistant_id,
    });

    // Check the Run status
    let run = await openai.beta.threads.runs.retrieve(threadId, runResponse.id);
    while (run.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(threadId, runResponse.id);
    }

    // Display the Assistant's Response
    const messagesResponse = await openai.beta.threads.messages.list(threadId);
    const assistantResponses = messagesResponse.data.filter(msg => msg.role === 'assistant');
    const response = assistantResponses.map(msg =>
      msg.content
        .filter(contentItem => contentItem.type === 'text')
        .map(textContent => textContent.text.value)
        .join('\n')
    ).join('\n');

    res.json({ response });

  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './upload'); // Save uploaded files to the 'uploads' directory
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname)); // Set the filename to be unique
//   },
// });

// Set up multer with the storage configuration
// const upload = multer({ storage: storage });

// app.post('/upload', upload.array('files'), async (req, res) => {
//   console.log("req.filereq.file", req.files)
//   if (req.files) {
//     const upload = await openai.files.create(
//       {
//         file: fs.createReadStream("./upload/" + req.files[0].filename),
//         purpose: 'assistants'
//       }

//     )
//     console.log("uploadiddđ", upload.id)
//     await openai.beta.assistants.update(assistant_id, {
//       file_ids: [upload.id],
//     });
//     // File has been uploaded successfully
//     res.redirect('/')
//   } else {
//     // No file uploaded
//     res.redirect('/')
//   }
// });
// app.post("/upload", async (req, res) => {
//   try {
//     console.log(`Upload API call started`);

//     // Retrieving the file from the form data
//     const data = await request.formData();
//     const file: File | null = data.get('file') as unknown as File;

//     // Check if a file was provided in the request
//     if (!file) {
//       console.log('No file found in the request');
//       return NextResponse.json({ success: false });
//     }

//     // Convert file to buffer and write to a temporary location
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
//     const path = `/tmp/${file.name}`;
//     await writeFile(path, buffer);
//     console.log(`File written to ${path}`);


//     // Uploading the file to OpenAI
//     console.log('Starting file upload to OpenAI');
//     const fileForRetrieval = await openai.files.create({
//       file: createReadStream(path),
//       purpose: "assistants",
//     });
//     console.log(`File uploaded, ID: ${fileForRetrieval.id}`);

//     // Respond with the file ID
//     return NextResponse.json({ success: true, fileId: fileForRetrieval.id });

//   } catch (error) {
//     console.error("Error processing chat:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
