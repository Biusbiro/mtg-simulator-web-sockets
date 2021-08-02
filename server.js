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
        socket.emit('updateGame', game);
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
    game = game.players.filter(function(item) {return item.players.name != data.player})
    addToPile(removeFromPiles(data), data);
}

// remove a carta da pilha que estiver e retorna a carta
function removeFromPiles(data){
    var card = [];
    var player = game.players.filter(function(item) { return item.name == data.player })[0];
    card.push(removeFromPile(player.tokens, data.cardId));
    card.push(removeFromPile(player.deck, data.cardId));
    card.push(removeFromPile(player.hand, data.cardId));
    card.push(removeFromPile(player.grave, data.cardId));
    card.push(removeFromPile(player.exilium, data.cardId));
    card.push(removeFromPile(player.lands, data.cardId));
    card.push(removeFromPile(player.nonLands, data.cardId));
    card.push(removeFromPile(player.xDeck, data.cardId));
    card.push(removeFromPile(player.xGrave, data.cardId));
    card.push(removeFromPile(player.xExilium, data.cardId));
    card.push(removeFromPile(player.xLands, data.cardId));
    card.push(removeFromPile(player.xNonLands, data.cardId));
    card.push(removeFromPile(player.xHand, data.cardId));
    return {
        card: card[0],
        player: player
    };
}

function removeFromPile(container, cardId){
    var card = container.filter(function(item) { return item.id == cardId})[0];
    container = container.filter(function(item) { return item.id != cardId});
    return card;
}

function addToPile(cardPlayer, data){
    switch (data.container) {
        case "#arenaPlayerLands":   cardPlayer.player.lands.push(cardPlayer.card);     break;
        case "#arenaOpponentLands": cardPlayer.player.xLands.push(cardPlayer.card);    break;
        case "#arenaPlayerCards":   cardPlayer.player.nonLands.push(cardPlayer.card);  break;
        case "#arenaOpponentCards": cardPlayer.player.xNonLands.push(cardPlayer.card); break;
        case "#containerBottom":    cardPlayer.player.hand.push(cardPlayer.card);      break;
        case "#containerTop":       cardPlayer.player.xHand.push(cardPlayer.card);     break;
        default:                                                                       break;
    }

    var versusPlayer = game.players.filter(function(item) { return item.name != data.player })[0];
    game.players = [];
    game.players.push(versusPlayer);
    game.players.push(cardPlayer.player);
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