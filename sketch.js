//width & height of storage, width of memory ... px
let DIMENSION;

//starting locations of each element ... px
let X_OFFSET_STORE;
let X_OFFSET_MEM;

let Y_OFFSET_STORE;
let Y_OFFSET_DRAM;
let Y_OFFSET_PMEM;

//rows in each type of memory ... int
let HEIGHT_DRAM;
let HEIGHT_PMEM;

//number of units per DIMENSION ... int
let DENSITY_STORE;
let DENSITY_MEM;

//size of each unit ( DIMENSION / DENSITY ) ... px
let UNIT_STORE;
let UNIT_MEM;

//representations of files in storage
let fileStructure; //2d array used to draw storage ... [int][int]
let fileList; //array of files ... [SimFile]

let dram;
let lru;
let pmem;

//2d array, purely for graphics
//6x2n, all floats
//(x1i | -1), y1i, x1f, y1f, d1x, d1y
//(x2i | -1), y2i, x2f, y2f, d2x, d2y
let swap;

//STATISTICS
let pageReads = 0;
let promDem = 0;
let scans = 0;

function create2DArray(rows) {
	let arr = [];
	for (let i = 0; i < rows; i++) arr[i] = [];
	return arr;
}

function xpos_store(x) {
	return x * UNIT_STORE + X_OFFSET_STORE;
}

function ypos_store(y) {
	return y * UNIT_STORE + Y_OFFSET_STORE;
}

function xpos_mem(x) {
	return x * UNIT_MEM + X_OFFSET_MEM;
}
function ypos_dram(y) {
	return y * UNIT_MEM + Y_OFFSET_DRAM;
}
function ypos_pmem(y) {
	return y * UNIT_MEM + Y_OFFSET_PMEM;
}

function span_store(s) {
	return s * UNIT_STORE;
}

function span_mem(s) {
	return s * UNIT_MEM;
}

function initialize_system_configuration() {

}

function setConstants() {
	DIMENSION = 0.4 * float(width);
	X_OFFSET_STORE = DIMENSION / 8;
	Y_OFFSET_STORE = (float(height) - DIMENSION) / 2;

	DENSITY_STORE = int(pow(2, 7));
	UNIT_STORE = DIMENSION / float(DENSITY_STORE);

	HEIGHT_DRAM = 27;
	HEIGHT_PMEM = 72;

	DENSITY_MEM = int(110);
	UNIT_MEM = DIMENSION / float(DENSITY_MEM);

	X_OFFSET_MEM = 11 * X_OFFSET_STORE;
	Y_OFFSET_DRAM = Y_OFFSET_STORE;
	Y_OFFSET_PMEM = Y_OFFSET_DRAM + DIMENSION - HEIGHT_PMEM*UNIT_MEM;
}

function setup() {
	frameRate(60);
	createCanvas(windowWidth, windowHeight)
	setConstants();

	fileStructure = createFileStructure();
	fileList = fileAnalysis(fileStructure);

	swap = create2DArray(HEIGHT_DRAM * DENSITY_MEM);
	for(let i = 0; i < HEIGHT_DRAM * DENSITY_MEM; i++) {
		swap[i][0] = -1;
	}

	background(255);

	stroke(0);
	strokeWeight(span_store(1)/4);
	fill(255);
	drawFileStructure();

	noStroke();
	fill(0);
	textSize(30);
	text("Storage", X_OFFSET_STORE, Y_OFFSET_STORE - 10);

	lru = new HeatQueue();
	dram = new Memory(HEIGHT_DRAM, DENSITY_MEM);
	pmem = new Memory(HEIGHT_PMEM, DENSITY_MEM);
}

let interval = 60;
let time = 0;

function draw() {
	/*
	fill(0, 0, 0, 30);
	stroke(255);
	drawFileStructure();
	*/

	if(time == interval) {
		scanMem();
		time = 0;
	}

	/*
	fill(0,0,0, 100);
	for(let i = 0; i < dram.size; i++) {
		if(swap[i][0] != -1) {
			if(abs(swap[i][0] - swap[i][2]) < 0.001) {
				swap[i][0] = -1;
				continue;
			} 
			rect(swap[i][0] += swap[i][4], swap[i][1] += swap[i][5], span_mem(1), span_mem(1));
		}
	}
	*/

	fill(255);
	noStroke();
	rect(width / 2, 0, width / 2, height);
	rect(0, Y_OFFSET_STORE + DENSITY_STORE*UNIT_STORE, width / 2, Y_OFFSET_STORE);

	textSize(30);
	fill(0);
	text("DRAM", X_OFFSET_MEM, Y_OFFSET_DRAM - 10);
	text("PMEM", X_OFFSET_MEM, Y_OFFSET_PMEM - 10);
	textSize(15);
	text("Page Reads: " + pageReads + "\t|\tScans: " + scans + "\t|\tPromotions & Demotions: " + 2*promDem + "\t|\tFrame Rate: " + frameRate(),
		X_OFFSET_STORE, height - 30);

	noStroke();
	for(let i = 0; i < dram.size; i++) {
		let currentTemp = dram.pages[i].temperature;
		if(currentTemp > 0) fill(124, 242, 18);
		else if(currentTemp < 0) fill(255, 66, 66);
		else fill(0);
		rect(xpos_mem(i % DENSITY_MEM), ypos_dram(int(i / DENSITY_MEM)), span_mem(1), span_mem(1));
	}
	for(let i = 0; i < pmem.size; i++) {
		let currentTemp = pmem.pages[i].temperature;
		if(currentTemp > 0) fill(124, 242, 18);
		else if(currentTemp < 0) fill(255, 66, 66);
		else fill(0);
		rect(xpos_mem(i % DENSITY_MEM), ypos_pmem(int(i / DENSITY_MEM)), span_mem(1), span_mem(1));
	}
	
	requestPages();
	time++;
}

function scanMem() {
	scans++;
	for(let i = 0; i < dram.size; i++) {
		if(dram.pages[i].temperature > 1) dram.pages[i].temperature = 1;
		else if(dram.pages[i].temperature > -1) dram.pages[i].temperature--;
	}
	for(let i = 0; i < pmem.size; i++) {
		if(pmem.pages[i].temperature > 1) {
			promDem++;
			let j = lru.deqenq();
			/*
			for(let k = 0; k < dram.size - 1; k++) {
				if(swap[k][0] == -1) {
					swap[k][0] = (i % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k][1] = int(i / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_PMEM;
					swap[k][2] = (j % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k][3] = int(j / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_DRAM;
					swap[k][4] = (swap[k][2] - swap[k][0]) / interval;
					swap[k][5] = (swap[k][3] - swap[k][1]) / interval;

					swap[k+1][0] = (j % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k+1][1] = int(j / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_DRAM;
					swap[k+1][2] = (i % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k+1][3] = int(i / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_PMEM;
					swap[k+1][4] = (swap[k+1][2] - swap[k+1][0]) / interval;
					swap[k+1][5] = (swap[k+1][3] - swap[k+1][1]) / interval;

					break;
				}
			}
			*/
			promotePage(i, j);
		}
		else if(pmem.pages[i].temperature > -1) pmem.pages[i].temperature--;
	}
}

function promotePage(promote, demote) {
	let temp = pmem.pages[promote];
	pmem.pages[promote] = dram.pages[demote];
	dram.pages[demote] = temp;

	dram.pages[demote].temperature = 0;
	pmem.pages[promote].temperature = 0;
}

function requestPages() {
	for(let i = 0; i < 70; i++) {

		pageReads++;
		let fileIndex = int(random(0, fileList.length)) //0.6
		let pageIndex = int(random(0, 0.4*pow(fileList[fileIndex].size, 2))); //0.1141
		
		fill(124, 242, 18, 90);
		noStroke();
		drawPageAccess(fileIndex, pageIndex);

		if(fileList[fileIndex].pages[pageIndex].location == -1) {
			if(dram.size < HEIGHT_DRAM * DENSITY_MEM) {
				lru.touch(dram.size);
				fileList[fileIndex].pages[pageIndex].location = dram.size;
				dram.pages[dram.size] = fileList[fileIndex].pages[pageIndex];
				dram.pages[dram.size++].temperature = 0;
			} else if(pmem.size < HEIGHT_PMEM * DENSITY_MEM) {
				fileList[fileIndex].pages[pageIndex].location = dram.size + pmem.size;
				pmem.pages[pmem.size] = fileList[fileIndex].pages[pageIndex];
				pmem.pages[pmem.size++].temperature = 0;
			} else {
				//search pmem for empty page frame
			}
		} else if(fileList[fileIndex].pages[pageIndex].location >= HEIGHT_DRAM * DENSITY_MEM) {
			fileList[fileIndex].pages[pageIndex].temperature++;
		} else {
			lru.touch(fileList[fileIndex].pages[pageIndex].location);
			fileList[fileIndex].pages[pageIndex].temperature++;
		}
	}
}

function drawPageAccess(fileIndex, pageIndex) {
	let fileX = fileList[fileIndex].x;
	let fileY = fileList[fileIndex].y;
	let pageX = pageIndex % fileList[fileIndex].size;
	let pageY = int(pageIndex / fileList[fileIndex].size);

	let xOffset = 0;
	let yOffset = 0;
	let squareWidth = span_store(1);
	let squareHeight = span_store(1);

	if(pageX === 0)
		squareWidth -= span_store(1) / 4, xOffset += span_store(1) / 4;
	if(pageX === fileList[fileIndex].size - 1)
		squareWidth -= span_store(1) / 4;
	if(pageY === 0)
		squareHeight -= span_store(1) / 4, yOffset += span_store(1) / 4;
	if(pageY === fileList[fileIndex].size - 1)
		squareHeight -= span_store(1) / 4;

	rect(xpos_store(fileX + pageX) + xOffset,
			ypos_store(fileY + pageY) + yOffset,
			squareWidth, squareHeight);
} 

function drawFileStructure() {
	let len = fileList.length;
	for(let i = 0; i < len; i++) {
		rect(xpos_store(fileList[i].x), ypos_store(fileList[i].y), span_store(fileList[i].size), span_store(fileList[i].size));
	}
}

function createFileStructure() {
	//initilalize
	const files = create2DArray(DENSITY_STORE);
	for (let i = 0; i < DENSITY_STORE; i++)
		for (let j = 0; j < DENSITY_STORE; j++)
			files[i][j] = 0;

	//fill array
	for (let i = 0; i < DENSITY_STORE; i++) {
		for (let j = 0; j < DENSITY_STORE; j++) {
			if (files[i][j] === -1) continue;

			//find fitting squares
			let upperBound = DENSITY_STORE / 4 + 1;
			let attempt = 0;
			let found = false;
			while (!found) {
				attempt = int(random(1, min(upperBound, DENSITY_STORE - max(i, j) + 1)));

				let overlap = false;
				for (let k = 0; k < attempt; k++) {
					for (let l = 0; l < attempt; l++) {
						if (files[i + k][j + l] != 0) {
							overlap = true;
							break;
						}
					}
					if (overlap) break;
				}
				if (!overlap) found = true;
				else upperBound = attempt;
			}

			//fill out found square
			for (let k = 0; k < attempt; k++)
				for (let l = 0; l < attempt; l++)
					if (k === 0 && l === 0) files[i][j] = attempt;
					else files[i + k][j + l] = -1;
		}
	}
	return files;
}

function fileAnalysis(fileStructure) {
	const files = [];
	let index = 0;
	for(let i = 0; i < DENSITY_STORE; i++) {
		for(let j = 0; j < DENSITY_STORE; j++) {
			if(fileStructure[i][j] == -1) continue;
			files[index] = new SimFile(j, i, fileStructure[i][j], index++);
		}
	}
	return files;
}

class SimPage {
	constructor(file, x, y, location) {
		this.file = file;
		this.x = x;
		this.y = y;

		this.index = y * file.size + x;

		this.location = location;
		this.temperature = 0;
	}
}

class SimFile {
	constructor(x, y, size, index) {
		this.x = x;
		this.y = y;
		this.size = size;

		this.index = index;
		
		this.pages = [];
		for(let i = 0; i < this.size; i++) {
			for(let j = 0; j < this.size; j++) {
				this.pages[i*this.size + j] = new SimPage(this, j, i, -1);
			}
		}
	}
}

class Memory {
	constructor(rows, columns) {
		this.rows = rows;
		this.columns = columns;

		this.pages = [];
		this.size = 0;
	}
}

class Node {
	constructor(element) {
		this.element = element;
		this.next = null;
		this.previous = null;
	}
}

class HeatQueue {
	constructor() {
		this.head = null;
		this.tail = null;
	}

	touch(element) {
		let node = new Node(element);

		//empty q
		if(this.head === null) {
			this.head = node;
			this.tail = node;
			return;
		}

		//remove element from q
		let traverse = this.head;
		while(traverse !== null) {
			if(traverse.element === element) {
				if(traverse.previous === null) { //first element or only element
					return;
				} else if(traverse.next === null) { //last element of min 2
					//tail management
					this.tail = this.tail.previous;
					this.tail.next = null;
				} else { //middle element of min 3
					traverse.previous.next = traverse.next;
					traverse.next.previous = traverse.previous;
				}
				break;
			}
			traverse = traverse.next;
		}

		//head management
		let current = this.head;
		this.head = node;
		this.head.next = current;
		this.head.next.previous = this.head;
	}

	deqenq() {
		let node = new Node(this.tail.element);

		//tail management
		this.tail = this.tail.previous;
		this.tail.next = null;

		//head management
		let current = this.head;
		this.head = node;
		this.head.next = current;
		this.head.next.previous = this.head;

		return node.element;
	}
}