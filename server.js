import {Jimp, JimpMime} from 'jimp';
import express from 'express';
// import * as bodyParser from 'body-parser'
class Color {
	constructor(r, g, b, a=255) {
		this.r = r
		this.g = g
		this.b = b
		this.a = a
	}
}

const HSLToRGB = (hue, saturation, lightness) => {
	if (hue == undefined) {
		return [0, 0, 0]
	}

	let chroma = (1 - Math.abs(((2 * lightness) / 100) - 1)) * (saturation / 100),
	huePrime = hue / 60,
	secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1)),
	red,green,blue

	huePrime = Math.floor(huePrime)

	if (huePrime === 0) {
		red = chroma
		green = secondComponent
		blue = 0
	}
	else if (huePrime === 1) {
		red = secondComponent
		green = chroma
		blue = 0
	}
	else if (huePrime === 2) {
		red = 0
		green = chroma
		blue = secondComponent
	}
	else if (huePrime === 3) {
		red = 0
		green = secondComponent
		blue = chroma
	}
	else if (huePrime === 4) {
		red = secondComponent
		green = 0
		blue = chroma	
	}
	else if (huePrime === 5) {
		red = chroma
		green = 0
		blue = secondComponent
	}

	let lightnessAdjustment = (lightness / 100) - (chroma / 2)
	red = Math.round((red + lightnessAdjustment) * 255)
	green = Math.round((green + lightnessAdjustment) * 255)
	blue = Math.round((blue + lightnessAdjustment) * 255)

	return [red,green,blue]
}

const RGBToHSL = (r=0, g=0, b=0) => {
	r /= 255
	g /= 255
	b /= 255
	const l = Math.max(r, g, b),
	s = l - Math.min(r, g, b),
	h = s
	? l === r
		? (g - b) / s
		: l === g
		? 2 + (b - r) / s
		: 4 + (r - g) / s
	: 0
	return [
	60 * h < 0 ? 60 * h + 360 : 60 * h,
	100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
	(100 * (2 * l - s)) / 2,
	]
}

const rgbFormat = (color) => {
	const sColor = Object.values(color).map(a => a.toString())
	console.log(color, sColor)
	
	if (sColor.length < 3 || sColor.length > 4)
		throw Error('Mininum and maximum elements: 3, 4')

	for (let i=0;i<sColor.length;i++) {
		let value = sColor[i].match(/\d+/)
		if (!value) {
			throw Error(`Invalid RGB color format ${color}\nValid format: \'255, 0, 12\' or \'255, 0, 12, 255\'`)
		}
		value = parseInt(value)
		if (value < 0 || value > 255) {
			throw Error(`RGB color ${value} is not between 0 and 255`)
		}
		sColor[i] = value
	}
	return sColor
}

const hslFormat = (color) => {
	const sColor = Object.values(color).map(a => a.toString())
	limits = [360, 100, 100, 255]
	console.log(color, sColor)

	let limit
	
	if (sColor.length < 3 || sColor.length > 4)
		throw Error('Mininum and maximum elements: 3, 4')

	for (let i=0;i<sColor.length;i++) {
		let value = sColor[i].match(/\d+/)
		if (!value) {
			throw Error(`Invalid HSL color format ${color}\nValid format: \'360, 100, 100\' or \'123, 12, 12, 255\'`)
		}
		value = parseInt(value)
		limit = limits[i]
		if (value < 0 || value > limit) {
			throw Error(`RGB color ${value} is not between 0 and ${limit}`)
		}
		sColor[i] = value
	}
	return sColor
}

const isDigit = (str) => {
	console.log(typeof str)
	if (typeof str == "number") 
		return true
	// if (typeof str !== "string" )
		// return false
	console.log(str, "str")
	for (char of str) {
		if ('1234567890'.includes(char) == false) {
			return false
		}
	}
	return true
}

const genChunks = (src, size) => {
	let ret = []

	for (let i=0;i<src.length;i += size) {
		ret.push(src.slice(i, i + size))
	}
	return ret
}

// Convert a color code to HSL format
const codeFormat = (color) => {
	console.log(color)
	if (isDigit(color) == false) {
		throw Error(`Invalid code format ${color}\nValid format: A value encoded on 6 bytes`)
	}

	color = parseInt(color)
	if (color < 0 || color > 0xffffff) {
		throw Error(`Invalid value ${color}\nValid format: an integer (min: 0, max: 0xffffff)`)
	}
	color = color.toString(16)
	const l = color.length
	if (l < 6) {
		color = '0'.repeat(6 - l) + color
	}
	color = genChunks(color, 2).map(x => parseInt(x, 16))
	if (color[0] === 255) {
		color[0] = 0
	}
	color[0] = (color[0] * 360) / 255
	color[1] = (color[1] * 100) / 255
	//color[2] = ((color[2] / 2 + 128) * 100) / 255 - Original code
	color[2] = (((color[2] / 255) / 2) + 0.5) * 100
	return color
}

const COLOR_FORMAT = {
	'rgb': rgbFormat,
	'hsl': hslFormat,
	'code': codeFormat
}

const blackAndWhite = (pixel) => {
	const newValue = (pixel.r + pixel.g + pixel.b) / 3

	pixel.r = newValue
	pixel.g = newValue
	pixel.b = newValue
}

const defaultOp = (pixel, color) => {
	pixel.r = (pixel.r * color.r) / 255
	pixel.g = (pixel.g * color.g) / 255
	pixel.b = (pixel.b * color.b) / 255
	pixel.a = (pixel.a * color.a) / 255
}

const COLOR_MODE = {
	'default': defaultOp,
	'grayscale': blackAndWhite
}
/**function render(skin){
	//create canvas
	canvas = document.createElement("canvas");
	canvas.width = "96";
	canvas.height = "64";
	ctx = canvas.getContext("2d");

	ctx.drawImage(skin,192,64,64,32,8,32,64,30); //back feet shadow
	ctx.drawImage(skin,96,0,96,96,16,0,64,64); //body shadow
	ctx.drawImage(skin,192,64,64,32,24,32,64,30); //front feet shadow
	ctx.drawImage(skin,192,32,64,32,8,32,64,30); //back feet
	ctx.drawImage(skin,0,0,96,96,16,0,64,64); //body
	ctx.drawImage(skin,192,32,64,32,24,32,64,30); //front feet
	ctx.drawImage(skin,64,96,32,32,39,18,26,26); //left eye
	//right eye (flip and draw)
	ctx.save();
	ctx.scale(-1,1);
	ctx.drawImage(skin,64,96,32,32,-73,18,26,26);
	ctx.restore();
	//replace with image
	skin.parentNode.replaceChild(canvas,skin);
} */

function drawImage(img, x, y, w, h, dx, dy, dw, dh) {
	return img
		.clone()
		.crop({x, y, w, h})
		.resize({w: dw, h: dh});
	/**(skin,192,64,64,32,8,32,64,30)
(skin,96,0,96,96,16,0,64,64); 
(skin,192,64,64,32,24,32,64,30
(skin,192,32,64,32,8,32,64,30)
(skin,0,0,96,96,16,0,64,64); /
(skin,192,32,64,32,24,32,64,30
(skin,64,96,32,32,39,18,26,26) */
}

const getColorArg = (color, standard) => {
	if (Object.keys(COLOR_FORMAT).includes(standard) == false) {
		throw Error(`Invalid color format: ${standard}\nValid formats: rgb, hsl, code`)
	}
	color = COLOR_FORMAT[standard](color)
	return color
}
const colorLimitForSkin = (color, limit = 52.5) => {	
	if (color[2] < limit) {
		color[2] = limit
	}
	return color
}
const colorConvert = (color, standard) => {
	color = getColorArg(color, standard)

	if (standard == 'rgb') {
		color = RGBToHSL(color[0],color[1],color[2])
	}
	// Preventing full black or full white skins
	color = colorLimitForSkin(color)

	// Convert to RGB to apply the color
	color = HSLToRGB(color[0],color[1],color[2])

	return new Color(...color)
}
function setColor(color, mode, bitmap) {
	let buffer = bitmap,
		r, g, b, a, byte;

	// Apply color on every pixel of the img
	for (byte=0;byte<buffer.length;byte+=4) {
		// Get pixel
		r = buffer[byte]
		g = buffer[byte + 1]
		b = buffer[byte + 2]
		a = buffer[byte + 3]

		// Overwriting the pixel
		let pixel = new Color(r, g, b, a)
		COLOR_MODE[mode](pixel, color)

		// Replace the pixel in the buffer
		buffer[byte] = pixel.r
		buffer[byte + 1] = pixel.g
		buffer[byte + 2] = pixel.b
		buffer[byte + 3] = pixel.a
	}
	return buffer;
}
function reorderBody(bitmap) {
	// For the tee body
	// Reorder that the average grey is 192,192,192
	// https://github.com/ddnet/ddnet/blob/master/src/game/client/components/skins.cpp#L227-L263

	let frequencies = Array(256).fill(0),
		orgWeight = 0,
		buffer = bitmap,
		byte

	const newWeight = 192,
		invOrgWeight = 255 - orgWeight,
		invNewWeight = 255 - newWeight

	// Find the most common frequence
	for (byte=0;byte<buffer.length;byte+=4)
		if (buffer[byte + 3] > 128) {
			frequencies[buffer[byte]]++
		}

	for (let i=1;i<256;i++)
		if (frequencies[orgWeight] < frequencies[i]) {
			orgWeight = i
		}

	for (byte=0;byte<buffer.length;byte+=4) {
		let value = buffer[byte]

		if (value <= orgWeight && orgWeight == 0) {
			continue
		}
		else if (value <= orgWeight) {
			value = Math.trunc(((value / orgWeight) * newWeight))
		}
		else if (invOrgWeight == 0) {
			value = newWeight
		}
		else {
			value = Math.trunc((((value - orgWeight) / 
			invOrgWeight) * invNewWeight + newWeight))
		}

		buffer[byte] = value
		buffer[byte + 1] = value
		buffer[byte + 2] = value

	}
	return buffer

	// this.setCanvas()
}


async function renderSkin(skinname, color_body, color_feet) {
	return new Promise(async (resolve, reject) => {
		console.log("!2")
		
		// if (!require('fs').readdirSync('./skins/06/').includes(skin + ".png"))
		// 	skin = 'default';
		if (color_body !== -1)
			color_body = colorConvert(color_body, "code")
		// color_feet = HSLToRGB(codeFormat(color_body)[0], codeFormat(color_body)[1], codeFormat(color_body)[2])
		if (color_feet !== -1)
			color_feet = colorConvert(color_feet, "code")
		// Jimp.read("https://ddnet.org/skins/skin/community/" + skin + ".png")
		// Jimp.
		console.log("!3")
		// Jimp.read()
		try {

			let skin = await Jimp.read("https://ddnet.org/skins/skin/community/" + skinname + ".png");//, async (err, skin) => {
			console.log("!4")
			// if (err) {
			// 	console.log("!5")
			// 	// return console.error(err);
			// 	skin = await Jimp.read("./skins/default.png");
			// }
			// skin.clone().crop().resize({w})
			console.log("!6")
			let shadow_feet = drawImage(skin, 192, 64, 64, 32, 8, 32, 64*2, 30*2); //back feet shadow
			let shadow_body = drawImage(skin, 96, 0, 96, 96, 16, 0, 64*2, 64*2); //body shadow
			let shadow_front_feet = drawImage(skin, 192, 64, 64, 32, 24, 32, 64*2, 30*2); //front feet shadow
			let back_feet = drawImage(skin, 192, 32, 64, 32, 8, 32, 64*2, 30*2); //back feet
			let body = drawImage(skin, 0, 0, 96, 96, 16, 0, 64*2, 64*2)
			// .color([
				// { apply: 'hue', params: [0] },
				// { apply: 'saturate', params: [0] },
				// { apply: 'lighten', params: [20] },
				// { apply: '', params: [0] }
			// ]); //body
			
			let front_feet = drawImage(skin, 192, 32, 64, 32, 24, 32, 64*2, 30*2); //front feet
			let eye = drawImage(skin, 64, 96, 32, 32, 39, 18, 26*2, 26*2); //left eye

			// let shadow_feet = img.clone().cropQuiet(192, 64, 64, 32)
			// let shadow_body = img.clone().cropQuiet(96, 0, 96, 96); //body shadow
			// let shadow_front_feet = img.clone().cropQuiet(192, 64, 64, 32); //front feet shadow
			// let back_feet = img.clone().cropQuiet(192, 32, 64, 32); //back feet
			// let body = img.clone().cropQuiet(0, 0, 96, 96); //body
			// let front_feet = img.clone().cropQuiet(192, 32, 64, 32); //front feet
			// let eye = img.clone().cropQuiet(64, 96, 32, 32); //left eye
			
			let newImage = new Jimp({width: 192, height: 128});
		// newImage.bitmap.data.forEach(a => {
				// console.log(a)
				// a += 57;
			// })
			if (color_body !== -1) {
				body.bitmap.data = setColor(color_body, "grayscale", body.bitmap.data) 
				body.bitmap.data = reorderBody(body.bitmap.data)
				body.bitmap.data = setColor(color_body, "default", body.bitmap.data) 

				eye.bitmap.data = setColor(color_body, "grayscale", eye.bitmap.data) 
		//		eye.bitmap.data = reorderBody(eye.bitmap.data)
				eye.bitmap.data = setColor(color_body, "default", eye.bitmap.data) 
			}
			if (color_feet !== -1) {
				front_feet.bitmap.data = setColor(color_feet, "grayscale", front_feet.bitmap.data)
				front_feet.bitmap.data = setColor(color_feet, "default", front_feet.bitmap.data)

				back_feet.bitmap.data = setColor(color_feet, "grayscale", front_feet.bitmap.data)
				back_feet.bitmap.data = setColor(color_feet, "default", front_feet.bitmap.data)
			}


			39,18;
			-73,18;
			// let color = new Color(234, 140, 169);
			newImage.blit({src: shadow_feet, x: 8*2, y: 32*2})
			// newImage.blit(shadow_feet, 8*2, 32*2);
			newImage.blit({src: shadow_body, x: 2*16, y: 2*0});
			newImage.blit({src: shadow_front_feet, x: 2*24, y: 2*32});
			newImage.blit({src: back_feet, x: 2*8, y: 32*2});
			newImage.blit({src: body, x: 2*16, y: 2*0});
			newImage.blit({src: front_feet, x: 2*24, y: 2*32});

			newImage.blit({src: eye.clone(), x: 39*2, y: 18*2});
			newImage.flip({horizontal: true});

			newImage.blit({src: eye.clone(), x: (96-73)*2, y: 18*2});
				// newImage.flip(true, false);
			newImage.flip({horizontal: true});

			// newImage.scan(0, 0, newImage.bitmap.width, newImage.bitmap.height, function(x, y, idx) {
			// 	// x, y is the position of this pixel on the image
			// 	// idx is the position start position of this rgba tuple in the bitmap Buffer
			// 	// this is the image
			
			// 	var r = this.bitmap.data[idx + 0];
			// 	var g = this.bitmap.data[idx + 1];
			// 	var b = this.bitmap.data[idx + 2];
			// 	var a = this.bitmap.data[idx + 3];
			// 	let pixel = defaultOp({r, g, b, a}, {r: 156, g: 156, b: 156, a: 255});
			// 	// console.log(pixel)
			// 	this.bitmap.data[idx + 0] = pixel.r;
			// 	this.bitmap.data[idx + 1] = pixel.g;
			// 	this.bitmap.data[idx + 2] = pixel.b;
			// 	this.bitmap.data[idx + 3] = pixel.a;
			// 	// this.bitmap.data[idx + 3] = 57;
			
			// 	// rgba values run from 0 - 255
			// 	// e.g. this.bitmap.data[idx] = 0; // removes red from this pixel
			//   });	
			// 
			// console.log(newImage.getBase64Async(Jimp.MIME_PNG))
			console.log("!")
			resolve (newImage.getBuffer(JimpMime.png));
		} catch (e) {
			console.error(e)
		}

		// newImage.write('test1.png');
	});
// })
}

let app = express();

app.get("/render/:skin/:color_body/:color_feet", async (req, res) => {
	console.log(req.params)
	let skin = req.params.skin;
	let color_body = isNaN(parseInt(req.params.color_body)) ? -1 : parseInt(req.params.color_body) & 0xffffffff;
	let color_feet = isNaN(parseInt(req.params.color_feet)) ? -1 : parseInt(req.params.color_feet) & 0xffffffff;
	console.log(color_feet, color_body)
	// let color_feet = parseInt(req.params.color_feet) ?? -1;
	res.setHeader('Content-Type', 'image/png');
	let rendered = await renderSkin(skin, color_body, color_feet);
	console.log(rendered)

	res.send(rendered);
})
app.get("/render/:skin", async (req, res) => {
	console.log(req.params)
	let skin = req.params.skin;
	// let color_body = isNaN(parseInt(req.params.color_body)) ? -1 : parseInt(req.params.color_body) & 0xffffffff;
	// let color_feet = isNaN(parseInt(req.params.color_feet)) ? -1 : parseInt(req.params.color_feet) & 0xffffffff;
	// console.log(color_feet, color_body)
	// let color_feet = parseInt(req.params.color_feet) ?? -1;
	res.setHeader('Content-Type', 'image/png');
	let rendered = await renderSkin(skin, -1, -1);
	console.log(rendered)

	res.send(rendered);
})

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());
// app.use(bodyParser.raw());





app.listen(process.env.PORT || 4000)
// renderSkin('cammo', 15904888, 1315859);