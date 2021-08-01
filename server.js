const express = require('express');
const path = require('path');
var fs = require('fs');

const axios = require('axios');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;

const scrape = require('website-scraper');
const PuppeteerPlugin = require('website-scraper-puppeteer');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const shortid = require('shortid');
const rimraf = require("rimraf");

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'public'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use('/', (req, res) => {
    res.render('index.html') ;
});

var game = {
    cards: [],
    players: [],
    logs: []
};

// var htmlFile = fs.readFile('./temp/index.html', 'utf-8');
// console.log(htmlFile);

io.on('connection', socket => {
    console.log(`Socket conectado: ${socket.id}`);
    
    socket.on('init', data => {
        const closeFrontModal = async () => {
            await init(data);
            socket.emit('updateGame', game);
            socket.broadcast.emit('updateGame', game);
            socket.emit('closeModalAddCards', game);
        }
        closeFrontModal();
    });

    // socket.on('reveal', data => {
    //     reveal(data);
    //     socket.broadcast.emit('updateGame', game);
    //     socket.emit('updateGame', game);
    // });

    // socket.on('turn', data => {
    //     turn(data);
    //     socket.broadcast.emit('updateGame', game);
    //     socket.emit('updateGame', game);
    // });

    socket.on('move', data => {
        move(data);
        socket.broadcast.emit('updateGame', game);
    });

    // socket.on('draw', data => {
    //     draw(data);
    //     socket.broadcast.emit('updateGame', game);
    //     socket.emit('updateGame', game);
    // });

    // socket.on('setColor', data => {
    //     setColor(data);
    //     socket.broadcast.emit('updateGame', game);
    //     socket.emit('updateGame', game);
    // }) 

    // socket.on('returnToDeck', data => {
    //     returnToDeck(data);
    //     socket.broadcast.emit('updateGame', game);
    //     socket.emit('updateGame', game);
    // });

    // socket.on('addPlayer', data => {
    //     addPlayer(data);
    //     socket.broadcast.emit('updateGame', game);
    // });

    // socket.on('addCardsFromLigaMagic', data => {
    //     var listCards = addCardsFromLigaMagic(data);
    //     setTimeout(function () {
    //         console.log("Waiting");
    //     }, 8000);
    //     console.log("na devolução:", listCards);

    //     socket.broadcast.emit('updateGame', game);
    //     socket.emit('updateGame', game);
    // })
    
    socket.emit('updateGame', game);
});

server.listen(3000);

console.log("started server!");

// function reveal(cardId){
//     var card = game.cards.filter(function(item) { return item.id == cardId })[0];
//     card.reveal = !card.reveal;
// }

// function turn(cardId){
//     var card = game.cards.filter(function(item) { return item.id == cardId })[0];
//     card.turned = !card.turned;
// }

function move(data){
    addToPile(removeFromPiles(data), data);
}

// remove a carta da pilha que estiver e retorna a carta
function removeFromPiles(data){
    var card = [];
    var player = game.players.filter(function(item) { return item.name == data.player })[0];

    card.push(removeFromPile(player.tokens, cardId));
    card.push(removeFromPile(player.deck, cardId));
    card.push(removeFromPile(player.hand, cardId));
    card.push(removeFromPile(player.grave, cardId));
    card.push(removeFromPile(player.exilium, cardId));
    card.push(removeFromPile(player.lands, cardId));
    card.push(removeFromPile(player.nonLands, cardId));
    card.push(removeFromPile(player.xDeck, cardId));
    card.push(removeFromPile(player.xGrave, cardId));
    card.push(removeFromPile(player.xExilium, cardId));
    card.push(removeFromPile(player.xLands, cardId));
    card.push(removeFromPile(player.xNonLands, cardId));
    card.push(removeFromPile(player.xHand, cardId));

    return card[0];
}

function removeFromPile(container, cardId){
    container = container.filter(function(item) { return item.id != cardId});
    return container.filter(function(item) { return item.id == cardId})[0];
}

function addToPile(card, data){
    var player = game.players.filter(function(item) { return item.name == data.player })[0];

    switch (data.container) {
        case "#arenaPlayerLands":   player.lands.push(card);     break;
        case "#arenaOpponentLands": player.xLands.push(card);    break;
        case "#arenaPlayerCards":   player.nonLands.push(card);  break;
        case "#arenaOpponentCards": player.xNonLands.push(card); break;
        case "#containerBottom":    player.hand.push(card);      break;
        case "#containerTop":       player.xHand.push(card);     break;
        default:                                                 break;
    }
}

// function draw(player){
//     var playerCards = game.cards.filter(function(item) { return item.owner == player });
//     var cardDrawed = playerCards[Math.floor(Math.random()*playerCards.length)];
//     var container = player == "Player1"
//         ? "player1Hand"
//         : "player2Hand";

//     move({
//         cardId: cardDrawed.id,
//         container: container
//     });

//     addLog((player == "Player1" ? Player1Name : Player2Name) + " Comprou uma carta do Deck");
// }

// function setColor(data){
//     var card = game.cards.filter(function(item) { return item.id == data.cardId })[0];
//     card.color = data.color;
// }

function addLog(textLog){
    var log = {
        text: textLog,
        time: getTime()
    }

    game.logs.unshift(log);
}

function getTime(){
    var date = new Date;
    var seconds = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
    var minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    var hour = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    return hour + ":" + minutes + ":" + seconds;
}

// function returnToDeck(card){

// }


function getCards(cards, cardOwner){
    listCards = [];
    cards.forEach(element => {
        var card = {
            id: shortid.generate(),
            owner: cardOwner,
            uri: element,
            turned: false,
            reveal: false,
            color: "none",
            commander: false,
            dungeon: false,
            attached: false,
            counter: [],
            attachs: []
        }
        listCards.push(card);
    });
    addLog(`<spam class="nameLog">${cardOwner}</spam> entrou no jogo com ${listCards.length} cartas`);
    return listCards;
}

async function addCardsFromLigaMagic(data){
    var listCards = [];
    const html = await axios.get(data.uri);
    const dom = new JSDOM(html.data);
    const cards = dom.window.document.querySelectorAll('.dk-link-mobile');

    for (let i = 0; i < cards.length / 2 ; i++) {
        let item = cards[i].querySelector('img');
        let src = item.getAttribute('src-off');
        listCards.push(src);
    }

    var playerCards = getCards(listCards, data.player);

    return playerCards;
}

async function init(data){
    var cards = await addCardsFromLigaMagic(data);
    game.players.push({     
        name: data.player,
        life: 20,
        poison: 0,
        charge: 0,
        tokens: [],
        deck: [],
        hand: cards,
        grave: [],
        exilium: [],
        lands: [],
        nonLands: [],
        xDeck: [],
        xGrave: [],
        xExilium: [],
        xLands: [],
        xNonLands: [],
        xHand: []
    });
}