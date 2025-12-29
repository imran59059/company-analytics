import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Llama from './chat/Llama.jsx';
import ChatChankData from './chat/ChatChankData.jsx';
import NotFound from './chat/NotFound.jsx';
import ChatBot from './chat/Chat.jsx';
import ChatQwen from './chat/ChatQwen.jsx';
import ChatGemini from './chat/ChatGemini';
import ChatGeminiCalender from './chat/ChatGeminiCalender.jsx';
import TestCard from './components/TestCard.jsx';
import HomeMenu from './pages/HomeMenu.jsx';
import ChatWithCompany from './chat/ChatWithCompany.jsx';
import CompanyDetails from './chat/CompanyDetails.jsx';
import CompanyDetails2 from './chat/CompanyDetails2.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Llama /> },
      { path: 'streaming', element: <ChatBot /> },
      { path: 'calender-gimini', element: <ChatGeminiCalender /> },
      { path: 'database-gimini', element: <ChatGemini /> },
      { path: 'api', element: <ChatQwen /> },
      { path: 'not-streaming', element: <ChatChankData /> },
      { path: 'ai-chat', element: <ChatWithCompany /> },
      { path: 'company-details/:id', element: <CompanyDetails />},
      { path: 'company-details2/:id', element: <CompanyDetails2 />},
      { path: 'home-page', element: <HomeMenu /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
