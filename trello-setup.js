// Trello API Script - Node.js
// Luo board ja kortit automaattisesti

const axios = require('axios');

const TRELLO_KEY = 'YOUR_TRELLO_KEY';
const TRELLO_TOKEN = 'YOUR_TRELLO_TOKEN';

const createTrelloBoard = async () => {
  try {
    // 1. Luo board
    const boardResponse = await axios.post(
      `https://api.trello.com/1/boards/?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
      {
        name: 'Parents&Teachers App - 8 Week Plan',
        desc: 'Complete development and launch plan'
      }
    );
    
    const boardId = boardResponse.data.id;
    console.log('Board created:', boardId);

    // 2. Luo listat
    const lists = [
      'BACKLOG',
      'WEEK 1-2: CORE FEATURES',
      'WEEK 3-4: UI/UX & TESTING',
      'WEEK 5-6: LAUNCH PREP',
      'WEEK 7-8: LAUNCH & PRODUCTION',
      'IN PROGRESS',
      'TESTING',
      'DONE'
    ];

    const listIds = {};
    for (const listName of lists) {
      const listResponse = await axios.post(
        `https://api.trello.com/1/lists/?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
        {
          name: listName,
          idBoard: boardId
        }
      );
      listIds[listName] = listResponse.data.id;
    }

    // 3. Luo kortit Week 1-2:lle
    const week12Cards = [
      {
        name: 'Authentication & Security Enhancement',
        desc: 'Firebase Security Rules, Password reset, Email verification',
        due: '2025-10-24'
      },
      {
        name: 'Profile Management System',
        desc: 'Profile images, validation, tag optimization, UX improvements',
        due: '2025-10-25'
      },
      // ... lisää kortteja
    ];

    for (const card of week12Cards) {
      await axios.post(
        `https://api.trello.com/1/cards/?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`,
        {
          name: card.name,
          desc: card.desc,
          due: card.due,
          idList: listIds['WEEK 1-2: CORE FEATURES']
        }
      );
    }

    console.log('Board setup complete!');
    console.log(`Board URL: https://trello.com/b/${boardId}`);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

// Käynnistä
createTrelloBoard();

/* 
SETUP:
1. npm install axios
2. Hae Trello API key: https://trello.com/app-key
3. Hae token: https://trello.com/1/authorize?expiration=never&scope=read,write,account&response_type=token&name=Parents-Teachers-App&key=YOUR_KEY
4. Korvaa YOUR_TRELLO_KEY ja YOUR_TRELLO_TOKEN
5. node trello-setup.js
*/