let DIMENSION;
let X_OFFSET_STORE;
let Y_OFFSET_STORE;

let DENSITY_STORE;
let UNIT_STORE;

let X_OFFSET_MEM;
let Y_OFFSET_DRAM;
let Y_OFFSET_PMEM;

let DENSITY_MEM;
let UNIT_MEM;

let HEIGHT_DRAM;
let HEIGHT_PMEM;

function create2DArray(rows) {
	let arr = [];
	for (let i = 0; i < rows; i++) {
		arr[i] = [];
	}
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

function setConstants() {
	DIMENSION = 0.4 * float(width);
	X_OFFSET_STORE = DIMENSION / 8;
	Y_OFFSET_STORE = (float(height) - DIMENSION) / 2;

	DENSITY_STORE = int(pow(2, 7));
	UNIT_STORE = DIMENSION / float(DENSITY_STORE);

	HEIGHT_DRAM = 15;
	HEIGHT_PMEM = 40;

	DENSITY_MEM = int(75);
	UNIT_MEM = DIMENSION / float(DENSITY_MEM);

	X_OFFSET_MEM = 11 * X_OFFSET_STORE;
	Y_OFFSET_DRAM = Y_OFFSET_STORE;
	Y_OFFSET_PMEM = Y_OFFSET_DRAM + DIMENSION - HEIGHT_PMEM*UNIT_MEM;
}

let fileStructure;
let fileList;

let DRAMindex = 0;
let DRAM;
let heatDRAM = [];
let LRU;

let PMEMindex = 0; 
let PMEM;
let heatPMEM = [];

let swap;

let pageReads = 0;
let promDem = 0;
let scans = 0;

function setup() {
	createCanvas(windowWidth, windowHeight)
	setConstants();

	fileStructure = createFileStructure();
	fileList = fileAnalysis(fileStructure);

	DRAM = create2DArray(HEIGHT_DRAM * DENSITY_MEM);
	PMEM = create2DArray(HEIGHT_PMEM * DENSITY_MEM);

	swap = create2DArray(HEIGHT_DRAM * DENSITY_MEM);
	for(let i = 0; i < HEIGHT_DRAM * DENSITY_MEM; i++) {
		swap[i][0] = -1;
	}

	background(255);

	stroke(255);
	fill(0);
	drawFileStructure();

	textSize(30);
	text("Storage", 300, Y_OFFSET_STORE / 2 + 10);

	LRU = new iq();

	let b = new iq();
	for(let i = 0; i < 100; i++) {
		b.add(int(random(0, 100)));
	}
	console.log(b.size);
	for(let i = 0; i < 100; i++) {
		console.log(b.get());
	}
	let traverse = b.head;
	while(traverse !== null) {
		console.log(traverse);
		traverse = traverse.next;
	}

}

let interval = 60;
let time = 0;

function draw() {
	fill(0, 0, 0, 30);
	stroke(255);
	drawFileStructure();
	
	if(time == interval) {
		scanMem();
		time = 0;
	}

	fill(255);
	noStroke();
	rect(width / 2, 0, width / 2, height);
	rect(0, Y_OFFSET_STORE + DENSITY_STORE*UNIT_STORE, width / 2, Y_OFFSET_STORE);

	textSize(30);
	fill(0);
	text("DRAM", width / 2 + 300, Y_OFFSET_DRAM / 2 + 10);
	text("PMEM", width / 2 + 300, 310);
	textSize(15);
	text("Page Reads: " + pageReads + "\tScans: " + scans + "\tPromotions and Demotions: " + promDem,
		 500, 700);

	stroke(255);
	for(let i = 0; i < DRAMindex; i++) {
		if(heatDRAM[i] > 0) fill(0, 255, 0);
		else if(heatDRAM[i] < 0) fill(255, 0, 0);
		else fill(0);
		rect(xpos_mem(i % DENSITY_MEM), ypos_dram(int(i / DENSITY_MEM)), span_mem(1), span_mem(1));
	}
	for(let i = 0; i < PMEMindex; i++) {
		if(heatPMEM[i] > 0) fill(0, 255, 0);
		else if(heatPMEM[i] < 0) fill(255, 0, 0);
		else fill(0);
		rect(xpos_mem(i % DENSITY_MEM), ypos_pmem(int(i / DENSITY_MEM)), span_mem(1), span_mem(1));
	}

	fill(0);
	for(let i = 0; i < DRAMindex; i++) {
		if(swap[i][0] != -1) {
			rect(swap[i][0] += swap[i][4], swap[i][1] += swap[i][5], span_mem(1), span_mem(1));
			if(abs(swap[i][0] - swap[i][2]) < 1) swap[i][0] = -1;
		}
	}
	
	requestPages();

	time++;
}

function scanMem() {
	scans++;
	for(let i = 0; i < DRAMindex; i++) {
		if(heatDRAM[i] > 1) heatDRAM[i] = 1;
		else if(heatDRAM[i] > -1) heatDRAM[i]--;
	}
	for(let i = 0; i < PMEMindex; i++) {
		if(heatPMEM[i] > 1) {
			promDem++;
			let file = PMEM[i][0];
			let page = PMEM[i][1];
			let loc = fileList[file].pages[page].location;


			let j = LRU.get();
			for(let k = 0; k < DRAMindex - 1; k++) {
				if(swap[k][0] == -1) {
					swap[k][0] = ((loc - DRAMindex) % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k][1] = int((loc - DRAMindex) / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_PMEM;
					swap[k][2] = (j % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k][3] = int(j / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_DRAM;
					swap[k][4] = (swap[k][2] - swap[k][0]) / interval;
					swap[k][5] = (swap[k][3] - swap[k][1]) / interval;

					swap[k+1][0] = (j % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k+1][1] = int(j / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_DRAM;
					swap[k+1][2] = ((loc - DRAMindex) % DENSITY_MEM) * UNIT_MEM + X_OFFSET_MEM;
					swap[k+1][3] = int((loc - DRAMindex) / DENSITY_MEM) * UNIT_MEM + Y_OFFSET_PMEM;
					swap[k+1][4] = (swap[k+1][2] - swap[k+1][0]) / interval;
					swap[k+1][5] = (swap[k+1][3] - swap[k+1][1]) / interval;

					break;
				}
			}

			fileList[file].pages[page].location = j;
			fileList[DRAM[j][0]].pages[DRAM[j][1]] = loc;
			PMEM[i] = DRAM[j];
			DRAM[j][0] = file;
			DRAM[j][1] = page;
			heatDRAM[j] = 0;
			heatPMEM[i] = 0;
		}
		else if(heatPMEM[i] > -1) heatPMEM[i]--;
	}
}

function requestPages() {
	for(let i = 0; i < 60; i++) {

		pageReads++;
		let fileIndex = int(random(0, 0.6*fileList.length));
		let pageIndex = int(random(0, 0.1141 * pow(fileList[fileIndex].size, 2)));
		fill(255, 255, 255, 128);
		noStroke();
		rect(xpos_store(fileList[fileIndex].x + pageIndex % fileList[fileIndex].size),
				ypos_store(fileList[fileIndex].y + int(pageIndex / fileList[fileIndex].size)),
				span_store(1), span_store(1));

		if(fileList[fileIndex].pages[pageIndex].location == -1) {
			if(DRAMindex < HEIGHT_DRAM * DENSITY_MEM) {
				LRU.add(DRAMindex);
				fileList[fileIndex].pages[pageIndex].location = DRAMindex;
				DRAM[DRAMindex][0] = fileIndex; DRAM[DRAMindex][1] = pageIndex;
				heatDRAM[DRAMindex++] = 0;
			} else if(PMEMindex < HEIGHT_PMEM * DENSITY_MEM) {
				fileList[fileIndex].pages[pageIndex].location = DRAMindex + PMEMindex;
				PMEM[PMEMindex][0] = fileIndex; PMEM[PMEMindex][1] = pageIndex;
				heatPMEM[PMEMindex++] = 0;
			} else {
				//search pmem for empty page frame
			}
		} else if(fileList[fileIndex].pages[pageIndex].location >= HEIGHT_DRAM * DENSITY_MEM) {
			heatPMEM[fileList[fileIndex].pages[pageIndex].location - DRAMindex]++;
		} else {
			LRU.add(fileList[fileIndex].pages[pageIndex].location);
			heatDRAM[fileList[fileIndex].pages[pageIndex].location]++;
		}
	}
}

function drawFileStructure() {
	for (let i = 0; i < DENSITY_STORE; i++) {
		for (let j = 0; j < DENSITY_STORE; j++) {
			if (fileStructure[i][j] === -1) continue;
			rect(xpos_store(j), ypos_store(i), span_store(fileStructure[i][j]), span_store(fileStructure[i][j]));
		}
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
			files[index++] = new SimFile(j, i, fileStructure[i][j]);
		}
	}
	return files;
}

class SimPage {
	constructor(file, x, y, location) {
		this.file = file;
		this.x = x;
		this.y = y;
		this.location = location;
	}
}

class SimFile {
	constructor(x, y, size) {
		this.x = x;
		this.y = y;
		this.size = size;
		
		this.pages = [];
		for(let i = 0; i < this.size; i++) {
			for(let j = 0; j < this.size; j++) {
				this.pages[i*this.size + j] = new SimPage(this, j, i, -1);
			}
		}
	}
}

class Node {
	constructor(element) {
		this.element = element;
		this.next = null;
		this.previous = null;
	}
}

class iq {
	constructor() {
		this.head = null;
		this.size = 0;
	}

	add(element) {
		let node = new Node(element);
		let current;

		if(this.head === null) {
			this.head = node;
		} else {
			let traverse = this.head;
			while(traverse !== null) {
				if(traverse.element === element) {
					if(traverse.previous !== null) {
						traverse.previous.next = traverse.next;
						if(traverse.next !== null)
							traverse.next.previous = traverse.previous;
					} else {
						this.head = traverse.next;
					}
					break;
				}
				if(traverse.next === null) break;
				traverse = traverse.next;
			}
			current = this.head;
			this.head = node;
			this.head.next = current;
			this.head.next.previous = this.head;
			this.size++;
		}
	}

	get() {
		let traverse = this.head;
		while(traverse.next !== null)
			traverse = traverse.next;

		this.add(traverse.element);

		return traverse.element;
	}

	print() {
		let traverse = this.head;
		while(traverse !== null) {
			console.log(traverse);
			traverse = traverse.next;
		}
	}
}