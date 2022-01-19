let DIMENSION;
let X_OFFSET;
let Y_OFFSET;

let DENSITY;
let UNIT;

function create2DArray(rows) {
	let arr = [];
	for (var i = 0; i < rows; i++) {
		arr[i] = [];
	}
	return arr;
}

function contain(pos) {
	while (pos < 0)
		pos += DIMENSION;
	while (pos >= DIMENSION)
		pos -= DIMENSION;
	return pos;
}

function xpos(x) {
	return contain(x * UNIT) + X_OFFSET;
}

function ypos(y) {
	return contain(y * UNIT) + Y_OFFSET;
}

function span(s) {
	return s * UNIT;
}

let files;

function setup() {
	createCanvas(windowWidth, windowHeight)
	DIMENSION = 0.8 * min(float(width), float(height));
	X_OFFSET = (float(width) - DIMENSION) / 2;
	Y_OFFSET = (float(height) - DIMENSION) / 2;

	DENSITY = int(pow(2, 7));
	UNIT = DIMENSION / float(DENSITY);

	files = createFileStructure();

	stroke(255);
	fill(0);
	background(255);

	noLoop();
}

function draw() {
	for (let i = 0; i < DENSITY; i++) {
		for (let j = 0; j < DENSITY; j++) {
			if (files[i][j] === -1) continue;
			rect(xpos(j), ypos(i), span(files[i][j]), span(files[i][j]));
		}
	}
}

function createFileStructure() {
	//initilalize
	const files = create2DArray(DENSITY);
	for (let i = 0; i < DENSITY; i++)
		for (let j = 0; j < DENSITY; j++)
			files[i][j] = 0;

	//fill array
	for (let i = 0; i < DENSITY; i++) {
		for (let j = 0; j < DENSITY; j++) {
			if (files[i][j] === -1) continue;

			//find fitting squares
			let upperBound = DENSITY / 4 + 1;
			let attempt = 0;
			let found = false;
			while (!found) {
				attempt = int(random(1, min(upperBound, DENSITY - max(i, j) + 1)));

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