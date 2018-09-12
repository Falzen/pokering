
$(document).ready(function () {

	init();
	nextTurn();
	/*
	//admin next turn
	document.getElementById('nextTurn').addEventListener('click', function () {
		nextTurn();
	});
	*/
	$('.player-choice').click(function(el) {
		if(!state.areChoicesEnabled) {
			return;
		}
		disableChoices();

		var action = this.dataset.action;
		setTimeout(function() {
			turnEventsHub(action);	
		}, 100);
		
	});



});












/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * V A R I A B L E S * */
var allDecks = [];
var preventInfiniteLoop = 0;

var me = {};
me.handData = [];
me.handDom = document.getElementById('myHand');
me.money = 500;
me.thisHandBet = 0;
me.hasFolded = false;


var bot = {};
bot.handData = [];
bot.handDom = document.getElementById('myHand');
bot.money = 500;
bot.thisHandBet = 0;
bot.hasFolded = false;
bot.justRaised = false;


var state = {};
state.steps = ['preflop', 'flop', 'turn', 'river', 'end'];
state.currentTurnIndex = 0;
state.sharedHand = []; // sharedHand
state.sharedHandDOM = document.getElementById('middleCards');
state.areChoicesEnabled = false; // areChoicesEnabled
state.potMoney = 0;
state.askForPlayerBet = false;













/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * I N I T I A L I Z A T I O N * */
function init() {
	// TODO set custom amounts?
	initMoney();

	// creating the playing deck (with that many decks)
	constructPlayingDeck(1);

	// deal the first cards
	newHands();


}
function constructPlayingDeck(decksNb) {
	for (var i = 0; i < decksNb; i++) {
		allDecks = allDecks.concat(deck);
	}
}




















/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * T U R N S   M A N A G E M E N T * */

function turnEventsHub(action) {
	switch(action) {
		case 'fold':
		endOfHand();
		break;
		case 'check-call':
		state.currentTurnIndex++;
		check();
		break;
		case 'raise':
		state.currentTurnIndex++;
		raise();
		break;
	}
}


function endOfHand() {
	
	disableChoices();
	// TODO ce qu'il faut quoi
	alert('End of Hand');
	// reset the steps of game
	state.currentTurnIndex = 0;
	// NB: ongoing bets are reset in betting process (myTurn() and botTurn());
	emptyDomCards();
	newHands();
	nextTurn();


}

function check() {	
	alert('You check');
	manageBetIncrements(0);
}

function raise() {	
	var myBet = prompt('my bet ?');
	manageBetIncrements(myBet);

}















function myTurn(betSettings) {	
	// while temporary bet + all already bet < p2's bet
	do {
		if(bot.justRaised) {
			var msg = 'BOT just raised me for ' + (bot.thisHandBet - me.thisHandBet) + '.';
			msg += '\n(Cancel to fold)';
			msg += '\n\tMy bet ? ('+(bot.thisHandBet - me.thisHandBet)+' to call)';
			betSettings.temp1 = prompt(msg);
		}
		else if(state.askForPlayerBet) {
			var msg = 'Combien ?';
			betSettings.temp1 = prompt(msg);
			state.askForPlayerBet = false;
		}
		else {
			betSettings.temp1 = betSettings.myAmount;
		}

		// if cancel clicked
		if (betSettings.temp1 == null) {
			// no need to touch me.money, already substracted on last bet
			// adding current bets (pot) to BOT money
			refreshMoney('bot', state.potMoney);
			refreshMoney('pot', (-1*state.potMoney));
			me.hasFolded = true;
			endOfHand();
			return;
		}
		// if letters or whatnot
		if (isNaN(parseInt(betSettings.temp1))) {
			alert('not a valid bet');
			state.askForPlayerBet = true;
		}
		// if not enough to call
		if ((parseInt(me.thisHandBet) + parseInt(betSettings.temp1)) < parseInt(bot.thisHandBet)) {
			alert('not enough');
			preventInfiniteLoop++;
			if(preventInfiniteLoop == 3) return;
		}			
		// keep asking until betting or cancelling
	} while (isNaN(parseInt(betSettings.temp1)) || (parseInt(me.thisHandBet) + parseInt(betSettings.temp1)) < parseInt(bot.thisHandBet));

	bot.justRaised = false;
	// assign new bet amount
	me.thisHandBet += parseInt(betSettings.temp1);
	refreshMoney('me', (-1*betSettings.temp1));
	refreshMoney('pot', betSettings.temp1);
	return betSettings;
}













function botTurn(betSettings) {
	// if p1 bet more than p2 OR bet 0 (check)
	if (me.thisHandBet > bot.thisHandBet || betSettings.temp1 == 0) {
		betSettings.temp2 = getRandomBetting(parseInt(betSettings.temp1));
		// if cancel clicked
		if (betSettings.temp2 == null) {
			alert('Bot folded.\nYou win: '+state.potMoney+'.');
			// adding current bets to my money
			// no need to touch bot.money, already substracted on last bet
			refreshMoney('me', state.potMoney);
			refreshMoney('pot', (-1*state.potMoney));
			bot.hasFolded = true;
			endOfHand();
			return;
		}

		if((bot.thisHandBet + parseInt(betSettings.temp2)) > parseInt(me.thisHandBet)) {			
			bot.justRaised = true;
		}

		// assign new bet amount
		bot.thisHandBet += parseInt(betSettings.temp2);
		refreshMoney('bot', (-1*betSettings.temp2));
		refreshMoney('pot', betSettings.temp2);
		return betSettings;
	}
}
















function manageBetIncrements(myAmount) {
	var betSettings = {
		bet1_svg:  me.thisHandBet,
		bet2_svg:  bot.thisHandBet,
		temp1: -1,
		temp2: -1,
		myAmount: myAmount
	}

	do { // while bet amounts aren't the same
		betSettings = myTurn(betSettings);

		// if player folded
		if(betSettings == undefined) {			
			return;
		}

		betSettings = botTurn(betSettings);			
	} while (me.thisHandBet != bot.thisHandBet);

	nextTurn();	
}

function nextTurn() {
	var turnName = state.steps[state.currentTurnIndex];
	switch (turnName) {
		case 'preflop':
		
		detectEverybody();
		setTimeout(function() {
			enableChoices();	
		}, 150);

		break;

		case 'flop':

		addCardsInHand(getCardsFromDeck(3), 'shared');
		detectEverybody();
		setTimeout(function() {
			enableChoices();	
		}, 550);

		break;

		case 'turn':

		addCardsInHand(getCardsFromDeck(1), 'shared');
		detectEverybody();
		setTimeout(function() {
			enableChoices();	
		}, 150);

		break;

		case 'river': // same as turn
		
		addCardsInHand(getCardsFromDeck(1), 'shared');
		detectEverybody();
		setTimeout(function() {
			enableChoices();	
		}, 150);
		break;	

		case 'end':
		endOfHand();
		break;
	}
} // end nextTurn()

function disableNextTurnBtn() {
	document.getElementById('nextTurn').setAttribute('disabled', true);
}


function enableChoices() {
	$('#player-choice-container').addClass('enabled');
	state.areChoicesEnabled = true;
}
function disableChoices() {
	
	$('#player-choice-container').removeClass('enabled');
	state.areChoicesEnabled = false;
}




function getRandomBetting(temp1) {

	
	// set to null = fold
	var amount = null;
	// if betting at all
	var isBettingAtAll = Math.random();
	

	// is checking - calling (70%)

	if (isBettingAtAll < 0.7) {
		amount = me.thisHandBet - bot.thisHandBet;
		if(amount == 0) {
			alert('Bot checks');
		} else {			
			alert('Bot calls');
		}
		
	}
	// is raising - betting (20%)
	else if(isBettingAtAll >= 0.7 && isBettingAtAll <= 0.9) {
		if (temp1 == 0) { // betting
			amount = getRandomInt(10, 50);
			alert('Bot bets '+amount+'.');
			
		} else { // raising
			bot.justRaised = true;
			amount = temp1 + getRandomInt(temp1*2, bot.money);
			alert('Bot raises: '+amount+'.');
			
		}
	}
	// is folding (10%)
	if(isBettingAtAll > 0.9) {		
		
	}
	return amount;
}





/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * D E T E C T I O N * */

function refreshPotDisplay(potAmount){
	
	if(potAmount == undefined || potAmount == null) {
		potAmount = 0;
	}
	else if(potAmount == 'reset') {
		document.getElementById('pot').textContent = 0;
		return;
	}

	var previousPotAmout = document.getElementById('pot').textContent;
	document.getElementById('pot').textContent = parseInt(previousPotAmout) + parseInt(potAmount);
}

function initMoney() {
	document.getElementById('player-money').textContent = parseInt(me.money);
	document.getElementById('bot-money').textContent = parseInt(bot.money);
}
function refreshMoney(whose, amoutToAdd) {
	var target;
	switch(whose) {
		case 'me':
		target = document.getElementById('player-money');
		me.money += parseInt(amoutToAdd);
		break;
		case 'bot':
		target = document.getElementById('bot-money');
		bot.money += parseInt(amoutToAdd);
		break;
		case 'pot':
		target = document.getElementById('pot');
		state.potMoney += parseInt(amoutToAdd);
		break;
	}
	var currentMoneyAmount = target.textContent;
	target.textContent = (parseInt(currentMoneyAmount) + parseInt(amoutToAdd));
}



function detectEverybody() {
	detectFigures('me');
	detectFigures('bot');
}

function detectFigures(who) {

	// add handCards and middleCards
	var cardsToCheck;
	var whereToWrite;
	switch (who) {
		case 'me':
		cardsToCheck = me.handData.concat(state.sharedHand);
		whereToWrite = document.getElementById('player-figure');
		break;
		case 'bot':
		cardsToCheck = bot.handData.concat(state.sharedHand);
		whereToWrite = document.getElementById('bot-figure');
		break;
	}

	// NB: map's key format is Integer
	//	11: J, 12: Q, 13: K, 14: A 
	var nbCardsByValue = getQteByValue(cardsToCheck);
	console.log(nbCardsByValue);
	var nbCardsByColor = getQteByColor(cardsToCheck);

	// special case where 'case 2' is true twice (2 pairs)
	var nbPairs = 0;
	var fiveOfAKind = false;
	var fourOfAKind = false;
	var threeOfAKind = false;
	var hasFlush = false;
	var hasStraightFlush = false;
	var justValues = [];
	// detect some figures
	for (const [key, value] of nbCardsByValue.entries()) {
		justValues.push(key);
		switch (value) {
			case 5:
			fiveOfAKind = true;
			break;
			case 4:
			fourOfAKind = true;
			break;
			case 3:
			threeOfAKind = true;
			break;
			case 2:
			nbPairs++;

			break;
		}
	}
	// deduction for Fullhouse
	var hasFullHouse = threeOfAKind && nbPairs > 0;

	//simple flush ?
	for (const [key, value] of nbCardsByColor.entries()) {
		if (value == 5) {
			hasFlush = true;
		}
	}

	// straight and what kind
	justValues.sort((a, b) => a - b);
	var straightInfo = checkForStraightAndStraightFlush(cardsToCheck);
	var hasStraight = straightInfo.hasStraight;
	var hasStraightFlush = straightInfo.isStraightFlush;

	// displaying results
	var color;
	var style = '';
	if (who == 'me') {
		color= 'green';
		console.log('%c\tVous avez : ', 'color: grey; border-left: 2px solid rgba(0,0,0,0.2); font-size: 14px;');		
	}
	else {
		color= 'tomato';
		console.log('%c\tBOT a : ', 'color: grey; border-left: 2px solid rgba(0,0,0,0.2); font-size: 14px;');		
	}
	style = 'color: '+color+'; border-left: 2px solid rgba(0,0,0,0.2); font-size: 18px;';

	if (fiveOfAKind) {
		console.log('%c --  Waow  --\t', style);
		writeFigure(whereToWrite, '-- Waow  --');
	}
	else if (hasStraight && hasStraightFlush) {
		console.log('%c --  une suite à la couleur  --\t', style);
		writeFigure(whereToWrite, '-- une suite à la couleur  --');
	}
	else if (fourOfAKind) {
		writeFigure(whereToWrite, '--   un carré  --');
	}
	else if (hasFullHouse) {
		console.log('%c --  un full  --\t', style);
		writeFigure(whereToWrite, '-- un full  --');
	}
	else if (hasFlush) {
		console.log('%c --   une couleur  -- \t', style);
		writeFigure(whereToWrite, '--  une couleur --');
	}

	else if (hasStraight && !hasStraightFlush) {
		console.log('%c --  une suite  --\t', style);
		writeFigure(whereToWrite, '-- une suite  --');
	}
	else if (!hasFullHouse && nbPairs >= 2) {
		console.log('%c --  deux pairs  --\t', style);
		writeFigure(whereToWrite, '-- deux pairs  --');
	}
	else if (threeOfAKind && nbPairs == 0) {
		console.log('%c --  un brelan  --\t', style);
		writeFigure(whereToWrite, '-- un brelan  --');
	}
	else if (!hasStraight && !hasFullHouse && nbPairs == 1) {
		console.log('%c --  une paire  --\t', style);
		writeFigure(whereToWrite, '-- une paire  --');
	}
	else {
		console.log('%c --  rien  --\t', style);
		writeFigure(whereToWrite, '-- rien  --');
	}
}

function writeFigure(where, msg) {
	where.textContent = msg;
}


function getQteByColor(cards) {
	var mapColorsQuantities = new Map();
	for (var i = 0; i < cards.length; i++) {
		if (mapColorsQuantities.get(cards[i].suit) != undefined) {
			var temp = (1 * mapColorsQuantities.get(cards[i].suit)) + 1;
			mapColorsQuantities.set(cards[i].suit, temp);
		}
		else {
			mapColorsQuantities.set(cards[i].suit, 1);
		}
	}
	return mapColorsQuantities;
}

function getQteByValue(cards) {
	var mapValuesQuantities = new Map();
	for (var i = 0; i < cards.length; i++) {
		if (mapValuesQuantities.get(cards[i].value) != undefined) {
			var temp = (1 * mapValuesQuantities.get(cards[i].value)) + 1;
			mapValuesQuantities.set(cards[i].value, temp);
		}
		else {
			mapValuesQuantities.set(cards[i].value, 1);
		}
	}
	return mapValuesQuantities;
}

function checkForStraightAndStraightFlush(cards) {
	// sort overkill, already done
	cards.sort((a, b) => a.value - b.value);

	// if an Ace is at the end (value: 14), add one at the beginning so we don't miss a straight
	var adjustedCards = cards;
	if (cards[cards.length - 1].value == 14) {
		adjustedCards = [cards[cards.length - 1]].concat(cards);
	}


	var consecutiveIncrements = 0;
	var consecutiveColors = 0;

	var isStraightFlush = false;
	var hasStraight = false;
	var limit = adjustedCards.length - 1;
	for (var i = 0; i < limit; i++) {
		var diff = adjustedCards[i + 1].value - adjustedCards[i].value; // should be 1 OR special verification in case of Ace
		if (diff == 1 || (adjustedCards[i + 1].value == 2 && adjustedCards[i].value == 14)) {
			consecutiveIncrements++;
			if (adjustedCards[i + 1].suit == adjustedCards[i].suit) {
				consecutiveColors++;
			}
		}


		else {
			consecutiveIncrements = 0;
		}

		if (consecutiveIncrements == 4) {
			hasStraight = true;
		}
		if (consecutiveColors == 4) {
			isStraightFlush = true;
		}
	}

	return { hasStraight, isStraightFlush };
}

















/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * C A R D S   M A N I P U L A T I O N * */

function addCardsInHand(cards, who) {
	// data binding simulation
	var theHandDom;
	var theHandData;
	switch (who) {
		case 'me':
		theHandData = me.handData
		theHandDom = me.handDom;
		break;
		case 'bot':
		theHandData = bot.handData
		theHandDom = bot.handDom;
		break;
		case 'shared':
		theHandData = state.sharedHand
		theHandDom = state.sharedHandDOM;
		break;
	}
	for (var i = 0; i < cards.length; i++) {
		var oneCard = createOneCardDom(cards[i]);
		theHandData.push(cards[i]);
		theHandDom.getElementsByTagName('ul')[0].appendChild(oneCard);
	}
}


function newHands() {
	emptyHands();
	addCardsInHand(getCardsFromDeck(2), 'me');
	addCardsInHand(getCardsFromDeck(2), 'bot');
}

function emptyHands() {
	document.getElementById('myHand').getElementsByTagName('ul')[0].innerHTML = '';
	document.getElementById('botHand').getElementsByTagName('ul')[0].innerHTML = '';
	me.handDom = document.getElementById('myHand');
	bot.handDom = document.getElementById('botHand');
}
function emptyDomCards() {
	document.getElementById('middleCards').getElementsByTagName('ul')[0].innerHTML = '';
	state.sharedHandDOM = document.getElementById('middleCards');
}



function displayInConsole() {

	var botHandtodisplay = '';
	for (var i = 0; i < bot.handData.length; i++) {
		botHandtodisplay += bot.handData[i].value + bot.handData[i].suit + ', ';
	}

	var sharedHandtodisplay = '';
	for (var i = 0; i < state.sharedHand.length; i++) {
		sharedHandtodisplay += state.sharedHand[i].value + state.sharedHand[i].suit + ', ';
	}

	var myHandtodisplay = '';
	for (var i = 0; i < me.handData.length; i++) {
		myHandtodisplay += me.handData[i].value + me.handData[i].suit + ', ';
	}

}

function createOneCardDom(cardData) {
	var cardChar = '';
	switch (cardData.value) {
		case 11:
		cardChar = 'J';
		break;
		case 12:
		cardChar = 'Q';
		break;
		case 13:
		cardChar = 'K';
		break;
		case 14:
		cardChar = 'A';
		break;
		default:
		cardChar = cardData.value;
		break;
	}
	//var textToDisplay = cardChar + ' of ' + cardData.suit;
	var li = document.createElement('li');

	var cardContent = document.createElement('div');
	cardContent.className = 'card-content';

	var front = document.createElement('div');
	front.className = 'recto ' + cardData.suit;
	front.dataset.value = cardData.value;
	front.dataset.suit = cardData.suit;
	//front.textContent = textToDisplay;
	for(var i=0; i<4; i++) {
		var cardVal = document.createElement('span');
		cardVal.className = 'card-value';
		cardVal.textContent = cardChar;
		front.appendChild(cardVal);	
	}

	cardContent.appendChild(front);

	var back = document.createElement('div');
	back.className = 'verso';
	back.textContent += ' ? ';
	cardContent.appendChild(back);
	li.appendChild(cardContent);

	return li;
}

function getCardsFromDeck(qte) {
	if (qte > allDecks.length) {
		constructPlayingDeck(3);
	}
	var randIndex = 0;
	var drawnCards = [];
	for (var i = 0; i < qte; i++) {
		randIndex = getRandomInt(0, allDecks.length);
		drawnCards.push(allDecks[randIndex]);
		allDecks.splice(randIndex, 1);
	}
	return drawnCards;
}






/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
/* * U T I L S * */
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}


