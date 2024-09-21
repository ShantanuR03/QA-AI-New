import { useState } from 'react';
import axios from 'axios';
import './App.css';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from '../s3config';

function App() {
  const [topic, setTopic] = useState("Geography");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [remark, setRemark] = useState("");

  async function generateQuestion() {
    setQuestion("loading...");

    try {
      const response = await axios({
        url: `${import.meta.env.VITE_API_KEY}`,
        method: 'POST',
        data: {
          contents: [{
            parts: [
              { text: `Generate a simple question on topic ${topic} for a quiz. The question should be precise and objective. Only display the question. Generate new question for each request.` }
            ]
          }]
        }
      });

      setQuestion(response.data.candidates[0].content.parts[0].text);
    }
    catch(error){
      console.error('Error generating question:', error);
      setQuestion('Please try again.');
    }
  }

  async function checkAnswer() {
    setRemark("loading...");

    try {
      const response = await axios({
        url: `${import.meta.env.VITE_API_KEY}`,
        method: 'POST',
        data: {
          contents: [{
            parts: [
              { text: `Question: ${question}\nAnswer: ${answer}\nFor given question and answer, determine the correctness and relevance of the answer with question. Give me 'Answer is Correct or Incorrect', 'Expected answer: ' and 'Explanation: ' in this order only, print each of these on a new line. The Explanation should give explnation to the answer in a single line.` }
            ]
          }]
        }
      });

      if(response){
        const feedback = response.data.candidates[0].content.parts[0].text;
        const formattedFeedback = feedback.split('\n').map(line => `<li>${line}</li>`).join('');
        setRemark(formattedFeedback);

        // Upload to S3
        const dataToStore = {
          question: question,
          userAnswer: answer,
          remark: feedback,
          timestamp: new Date().toISOString(),
        };
        await uploadToS3(`question-${Date.now()}.json`, dataToStore);
      }

    }
    catch(error){
      console.error('Error checking answer:', error);
      setRemark('Please try again.');
    }
  }

  async function uploadToS3(fileName, data) {
    const params = {
      Bucket: 'cc208',
      Key: fileName,
      Body: JSON.stringify(data),
      ContentType: 'application/json'
    };
  
    try {
      const command = new PutObjectCommand(params);
      const result = await s3Client.send(command);
      console.log('File uploaded successfully:', result);
    } catch (err) {
      console.error('Error uploading file:', err);
    }
  }

  function clearScreen() {
    setQuestion("");
    setAnswer("");
    setRemark("");
  }

  return (
    <div className='mainBody'>
      <h1>Question-Answer-AI</h1>

      <div className='showOptions'>
        <label>Select a topic:</label>
        <select 
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}>
          <option value="Geography">Geography</option>
          <option value="Health">Health</option>
          <option value="Sports">Sports</option>
        </select>
        <button onClick={generateQuestion}>Generate</button>
      </div>

      <p>{question}</p>

      <div>
        <textarea 
          id="answer" 
          cols="60" 
          rows="1"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        ></textarea>
      </div>

      <div className='buttons'>
        <button onClick={checkAnswer}>Submit</button>
        <button id="clearButton" onClick={clearScreen}>Clear</button>
      </div>

      <p id='evaluation-remark' dangerouslySetInnerHTML={{ __html: remark }}></p>
    </div>
  );
}

export default App;