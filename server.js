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

const Player1Name = "Bismarck";
const Player2Name = "Renata";

var imgCardsPlayer1 = getCardsPlayer1();
var imgCardsPlayer2 = getCardsPlayer2();

// var deckPlayer1 = getCards(imgCardsPlayer1, "player1Deck", 'Player1');
// var deckPlayer2 = getCards(imgCardsPlayer2, "player2Deck", 'Player2');

var lifePlayer1 = 20;
var lifePlayer2 = 20;

var chargePlayer1 = 0;
var chargePlayer2 = 0;

var poisonPlayer1 = 0;
var poisonPlayer2 = 0;

// var allCards = deckPlayer1.concat(deckPlayer2);cards = allCards

var game = {
    cards: [],
    players: [],
    logs: []
};

let messages = [];

// rimraf.sync("./temp/"); // delete folder case exists
getCardsFromLigaMagic('https://www.ligamagic.com.br/?view=dks/deck&id=2574892'); // create folder




// var htmlFile = fs.readFile('./temp/index.html', 'utf-8');
// console.log(htmlFile);

io.on('connection', socket => {
    console.log(`Socket conectado: ${socket.id}`);

    socket.on('reveal', data => {
        reveal(data);
        socket.broadcast.emit('updateGame', game);
        socket.emit('updateGame', game);
    });

    socket.on('turn', data => {
        turn(data);
        socket.broadcast.emit('updateGame', game);
        socket.emit('updateGame', game);
    });

    socket.on('move', data => {
        move(data);
        socket.broadcast.emit('updateGame', game);
    });

    socket.on('draw', data => {
        draw(data);
        socket.broadcast.emit('updateGame', game);
        socket.emit('updateGame', game);
    });

    socket.on('setColor', data => {
        setColor(data);
        socket.broadcast.emit('updateGame', game);
        socket.emit('updateGame', game);
    }) 

    socket.on('returnToDeck', data => {
        returnToDeck(data);
        socket.broadcast.emit('updateGame', game);
        socket.emit('updateGame', game);
    });

    socket.on('addPlayer', data => {
        addPlayer(data);
        socket.broadcast.emit('updateGame', game);
    });

    socket.on('addCardsFromLigaMagic', data => {
        var listCards = addCardsFromLigaMagic(data);
        setTimeout(function () {
            console.log("Waiting");
        }, 8000);
        console.log("na devolução:", listCards);

        socket.broadcast.emit('updateGame', game);
        socket.emit('updateGame', game);
    })
    
    socket.emit('setPlayer', "Player" + (game.players.length + 1));
    socket.emit('updateGame', game);
});

server.listen(3000);

console.log("started server!");

function getCardsFromLigaMagic(uri){
    // $.ajax({
    //     url: uri,
    //     type: 'GET',
    //     success: function(res) {
    //         var headline = $(res.responseText).find('div.card-container-visual'); 
    //         $("#cabecalho").html(headline);
    //     }
    // });  
}

async function addCardsFromLigaMagic(data){
    var listCards = [];
    const html = await axios.get(data.uri);
    const dom = new JSDOM(html.data);
    const cards = dom.window.document.querySelectorAll('.dk-link-mobile');

    for (let i = 0; i < cards.length; i++) {
        let item = cards[i].querySelector('img');
        let src = item.getAttribute('src-off');
        listCards.push(src);
    }

    var deck = data.player == "Player1" ? "player1Deck" : "player2Deck";
    addCards = getCards(listCards, deck, data.player);
    game.cards = game.cards.concat(addCards);

    console.log("dentro do get", listCards);

    return listCards;
}

function reveal(cardId){
    var card = game.cards.filter(function(item) { return item.id == cardId })[0];
    card.reveal = !card.reveal;
}

function turn(cardId){
    var card = game.cards.filter(function(item) { return item.id == cardId })[0];
    card.turned = !card.turned;
}

function move(data){
    var card = game.cards.filter(function(item) { return item.id == data.cardId })[0];
    card.container = data.container;
}

function draw(player){
    var playerCards = game.cards.filter(function(item) { return item.owner == player });
    var cardDrawed = playerCards[Math.floor(Math.random()*playerCards.length)];
    var container = player == "Player1"
        ? "player1Hand"
        : "player2Hand";

    move({
        cardId: cardDrawed.id,
        container: container
    });

    addLog((player == "Player1" ? Player1Name : Player2Name) + " Comprou uma carta do Deck");
}

function setColor(data){
    var card = game.cards.filter(function(item) { return item.id == data.cardId })[0];
    card.color = data.color;
}

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

function returnToDeck(card){

}

function getCards(cards, cardContainer, cardOwner){
    listCards = [];
    cards.forEach(element => {
        var card = {
            id: shortid.generate(),
            owner: cardOwner,
            uri: element,
            turned: false,
            reveal: false,
            container: cardContainer,
            color: "none",
            attachs: []
        }
        listCards.push(card);
    });
    return listCards;
}

function addPlayer(player){
    game.players.push({
        name: player,
        life: 20,
        poison: 0,
        charge: 0
    });
}

function getCardsPlayer1(){
    return [

        // Criaturas (20)
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5100b9c0498-0ua6l-2u7ow-19133663285f5100b9c04f2.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5100b9c0498-0ua6l-2u7ow-19133663285f5100b9c04f2.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5100b9c0498-0ua6l-2u7ow-19133663285f5100b9c04f2.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5100b9c0498-0ua6l-2u7ow-19133663285f5100b9c04f2.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a20e49eed-2kr13-arltk-16496765645f57a20e49f2c.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a1e25bd1e-3r5fw-e3w6i-3360687705f57a1e25bd66.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a1e25bd1e-3r5fw-e3w6i-3360687705f57a1e25bd66.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a1e25bd1e-3r5fw-e3w6i-3360687705f57a1e25bd66.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f57a1e25bd1e-3r5fw-e3w6i-3360687705f57a1e25bd66.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479856/60db7d71d854e-lz40u-wox4p-29043833860db7d71d8596.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479856/60db7d71d854e-lz40u-wox4p-29043833860db7d71d8596.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479856/60db7d71d854e-lz40u-wox4p-29043833860db7d71d8596.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479856/60db7d71d854e-lz40u-wox4p-29043833860db7d71d8596.jpg",
    
        // Artefatos (16)
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e5e52ccbe29-sdy9n-qr7v1-177353246660e5e52ccbe6a.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e5e52ccbe29-sdy9n-qr7v1-177353246660e5e52ccbe6a.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e5e52ccbe29-sdy9n-qr7v1-177353246660e5e52ccbe6a.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e5e52ccbe29-sdy9n-qr7v1-177353246660e5e52ccbe6a.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b43070e1b-ug8ov-3qngf-61213675960e4b43070e7c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b43070e1b-ug8ov-3qngf-61213675960e4b43070e7c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b43070e1b-ug8ov-3qngf-61213675960e4b43070e7c.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b43070e1b-ug8ov-3qngf-61213675960e4b43070e7c.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b07262a70-iha6l-0gnrm-9499013660e4b07262ac0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b07262a70-iha6l-0gnrm-9499013660e4b07262ac0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b07262a70-iha6l-0gnrm-9499013660e4b07262ac0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479855/60e4b07262a70-iha6l-0gnrm-9499013660e4b07262ac0.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5101306821a-4j7hw-d0eza-12177827125f51013068269.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5101306821a-4j7hw-d0eza-12177827125f51013068269.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5101306821a-4j7hw-d0eza-12177827125f51013068269.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479816/5f5101306821a-4j7hw-d0eza-12177827125f51013068269.jpg",
    
        // Terrenos (24)
        "https://repositorio.sbrauble.com/arquivos/in/magic/479856/60dc9a784dcf3-bn819-hk3gu-177788284160dc9a784dd49.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479856/60dc9a784dcf3-bn819-hk3gu-177788284160dc9a784dd49.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfca949a90-mqcbn-2jah7-1016852369605dfca949ae1.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfca949a90-mqcbn-2jah7-1016852369605dfca949ae1.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfca949a90-mqcbn-2jah7-1016852369605dfca949ae1.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfca949a90-mqcbn-2jah7-1016852369605dfca949ae1.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479828/60bcf809ac096-59c2f-odw5a-33307443660bcf809ac0e0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479828/60bcf809ac096-59c2f-odw5a-33307443660bcf809ac0e0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479828/60bcf809ac096-59c2f-odw5a-33307443660bcf809ac0e0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479828/60bcf809ac096-59c2f-odw5a-33307443660bcf809ac0e0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479828/60bcf809ac096-59c2f-odw5a-33307443660bcf809ac0e0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479828/60bcf809ac096-59c2f-odw5a-33307443660bcf809ac0e0.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440cb7a22-85jukt-2s67gb-0aa1883c6411f7873cb83dacb17b0afc.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479793/5fca9a8e094de-3kewd-18rm5-2660931325fca9a8e09531.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479793/5fca9a8e094de-3kewd-18rm5-2660931325fca9a8e09531.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479793/5fca9a8e094de-3kewd-18rm5-2660931325fca9a8e09531.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479793/5fca9a8e094de-3kewd-18rm5-2660931325fca9a8e09531.jpg"
    ];
};

function getCardsPlayer2(){
    return [

        // Criaturas (14)
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60649a4f37d15-j9iw2-uz6wi-211851719560649a4f37d6a.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60649a4f37d15-j9iw2-uz6wi-211851719560649a4f37d6a.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60649a4f37d15-j9iw2-uz6wi-211851719560649a4f37d6a.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60649a4f37d15-j9iw2-uz6wi-211851719560649a4f37d6a.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfed56882f-fq2r3-dqs6n-398974922605dfed56888d.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfed56882f-fq2r3-dqs6n-398974922605dfed56888d.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfed56882f-fq2r3-dqs6n-398974922605dfed56888d.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfed56882f-fq2r3-dqs6n-398974922605dfed56888d.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60688947ec553-ghqjl-5gzv7-149248674760688947ec5ad.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60688947ec553-ghqjl-5gzv7-149248674760688947ec5ad.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60688947ec553-ghqjl-5gzv7-149248674760688947ec5ad.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60688947ec553-ghqjl-5gzv7-149248674760688947ec5ad.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/6068883f2986f-d7w6r-apug3-5692004796068883f298d9.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/6068883f2986f-d7w6r-apug3-5692004796068883f298d9.jpg",
    
        // Mágicas (20)
        "https://repositorio.sbrauble.com/arquivos/in/magic/479817/5f4fb9e4b40bf-1pb3r-d9np1-11746638365f4fb9e4b4103.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479817/5f4fb9e4b40bf-1pb3r-d9np1-11746638365f4fb9e4b4103.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479817/5f4fb9e4b40bf-1pb3r-d9np1-11746638365f4fb9e4b4103.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479817/5f4fb9e4b40bf-1pb3r-d9np1-11746638365f4fb9e4b4103.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479800/5f42444318111-15ua2d-2gzxok-5ef698cd9fe650923ea331c15af3b160.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479800/5f42444318111-15ua2d-2gzxok-5ef698cd9fe650923ea331c15af3b160.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479800/5f42444318111-15ua2d-2gzxok-5ef698cd9fe650923ea331c15af3b160.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479800/5f42444318111-15ua2d-2gzxok-5ef698cd9fe650923ea331c15af3b160.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/606886b1eda06-netg1-9ulrk-1559137334606886b1eda6e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/606886b1eda06-netg1-9ulrk-1559137334606886b1eda6e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/606886b1eda06-netg1-9ulrk-1559137334606886b1eda6e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/606886b1eda06-netg1-9ulrk-1559137334606886b1eda6e.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60673f689ec4d-gn1i7-eq5a2-200516027560673f689eca6.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60673f689ec4d-gn1i7-eq5a2-200516027560673f689eca6.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60673f689ec4d-gn1i7-eq5a2-200516027560673f689eca6.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/60673f689ec4d-gn1i7-eq5a2-200516027560673f689eca6.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479841/605e495f72a9b-qsw8k-jm7a5-1813105826605e495f72ae2.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479841/605e495f72a9b-qsw8k-jm7a5-1813105826605e495f72ae2.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479841/605e495f72a9b-qsw8k-jm7a5-1813105826605e495f72ae2.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479841/605e495f72a9b-qsw8k-jm7a5-1813105826605e495f72ae2.jpg",
    
        // Encantamentos (4)
        "https://repositorio.sbrauble.com/arquivos/in/magic/479795/5f4244414352c-1dvfsx-yu0lmf-d2ddea18f00665ce8623e36bd4e3c7c5.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479795/5f4244414352c-1dvfsx-yu0lmf-d2ddea18f00665ce8623e36bd4e3c7c5.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479795/5f4244414352c-1dvfsx-yu0lmf-d2ddea18f00665ce8623e36bd4e3c7c5.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479795/5f4244414352c-1dvfsx-yu0lmf-d2ddea18f00665ce8623e36bd4e3c7c5.jpg",
    
        // Terrenos (22)
        "https://repositorio.sbrauble.com/arquivos/in/magic/67044/5f4243e5c7dc0-awxe0o-ldowst-d947bf06a885db0d477d707121934ff8.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/67044/5f4243e5c7dc0-awxe0o-ldowst-d947bf06a885db0d477d707121934ff8.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/67044/5f4243e5c7dc0-awxe0o-ldowst-d947bf06a885db0d477d707121934ff8.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfd3501779-18e0d-2lfe0-1406059712605dfd35017bf.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfd3501779-18e0d-2lfe0-1406059712605dfd35017bf.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfd3501779-18e0d-2lfe0-1406059712605dfd35017bf.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479838/605dfd3501779-18e0d-2lfe0-1406059712605dfd35017bf.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/176324/5f42440c4f152-r4nl8o-k0zfme-0336dcbab05b9d5ad24f4333c7658a0e.jpg",
    
        "https://repositorio.sbrauble.com/arquivos/in/magic/479835/5fda7097d806c-zegh6-rji7s-5712495805fda7097d80d0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479835/5fda7097d806c-zegh6-rji7s-5712495805fda7097d80d0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479835/5fda7097d806c-zegh6-rji7s-5712495805fda7097d80d0.jpg",
        "https://repositorio.sbrauble.com/arquivos/in/magic/479835/5fda7097d806c-zegh6-rji7s-5712495805fda7097d80d0.jpg"
    ];
};
