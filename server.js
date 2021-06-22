const express = require('express');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'public'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use('/', (req, res) => {
    res.render('index.html') ;
});

let cards = []
setCards();

let messages = [];


io.on('connection', socket => {
    console.log(`Socket conectado: ${socket.id}`);

    socket.emit('previousMessages', messages);
    socket.emit('allCards', cards);

    socket.on('sendMessage', data => {
        console.log(data);
        messages.push(data);
        socket.broadcast.emit('receivedMessage', data);
    });

    socket.on('dragCard', data => {
        var card = refreshCardPosition(data);
        socket.broadcast.emit('updatedCardPosition', card);
    });

    socket.on('revealCard', cardId => {
        var card = refreshCardReveal(cardId);
        socket.broadcast.emit('updatedCardReveal', card);
    });
});

server.listen(3000);

function setCards(){
    cards.push({ id: 'div1', turned: false, owner: 'player1', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/2/5/254eebe3-70b8-4536-a660-630c3c654eea.jpg?1562827557', x: '20px', y: '20px'})
    cards.push({ id: 'div2', turned: false, owner: 'player1', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/6/5/651f6538-af29-47af-917c-3942a40cd5b1.jpg?1531202380', x: '20px', y: '20px'})
    cards.push({ id: 'div3', turned: false, owner: 'player1', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/f/5/f5f3860c-775d-4baa-b15d-e89ca0415f52.jpg?1615509417', x: '20px', y: '20px'})
    cards.push({ id: 'div4', turned: false, owner: 'player1', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/4/8/482437b6-6537-4df5-a1a8-feda0cc5e5d5.jpg?1606171696', x: '20px', y: '20px'})
    cards.push({ id: 'div5', turned: false, owner: 'player2', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/6/b/6b3e0255-50cd-46c6-ad3d-63c23df5372d.jpg?1615126530', x: '730px', y: '20px'})
    cards.push({ id: 'div6', turned: false, owner: 'player2', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/7/d/7da2ff7b-a344-4fe0-9188-a9bb471fd90d.jpg?1562819475', x: '730px', y: '20px'})
    cards.push({ id: 'div7', turned: false, owner: 'player2', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/7/c/7cc8c971-b612-4171-9d85-5173e61c5c61.jpg?1562739988', x: '730px', y: '20px'})
    cards.push({ id: 'div8', turned: false, owner: 'player2', reveal: false, uri: 'https://c1.scryfall.com/file/scryfall-cards/normal/front/6/5/654ecea7-1417-4546-b711-c5c76bee576e.jpg?1623221349', x: '730px', y: '20px'})
}

function refreshCardPosition(card){
    var updatedCard = cards.filter(function (item) {
        return item.id == card.id;
    });
    updatedCard[0].x = card.x;
    updatedCard[0].y = card.y;
    return updatedCard[0];
}

function refreshCardReveal(cardId){
    var updatedCard = cards.filter(function (item) {
        return item.id == cardId;
    });
    updatedCard[0].reveal = !updatedCard[0].reveal;
    return updatedCard[0];
}