// @ts-nocheck

class AutoText {
    static loadAnim = this.loadValues

    constructor(canvasElement) {
        this.canvas = canvasElement
        this.ctx = this.canvas.getContext('2d')
        //  👇  Gets data from html data attributes
        const data = JSON.parse(this.canvas.dataset.canvas)
        const [texts, fillWindow, textColor, speed] = data.reduce((arr, val) => {

            if (Array.isArray(val)) {
                arr[0] = val
            }
            if (typeof val === 'boolean') {
                arr[1] = val
            }
            if (typeof val === 'string') {
                arr[2] = val
            }
            if (typeof val === 'number') {
                arr[3] = val
            }
            return arr
        }, [])

        // Returns rgba or rgb to rgba with the alpha 0
        const createRGBA = c => {
            if (/^#/.test(c)) {
                return `rgba(${c.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
                    ,(m, r, g, b) => '#' + r + r + g + g + b + b)
                    .substring(1).match(/.{2}/g).map(x => parseInt(x, 16)).join(',')},0)` 
            } else if (/^rgb/.test(c)) {
                return c.replace(/(\w*)(\(.*,)(.*)/ig, '$1$20)')
            }
            // If color string will return black 0 alpha
            return 'rgba(0,0,0,0)'
        }

        this.rgba = createRGBA(textColor)
        this.requestID = 0
        this.fillWindow = fillWindow                    // 👈  true to fit as many words in the canvas at a time
        this.padding = 125                              // 👈  how much padding between items, change if needed
        this.textColor = textColor || 'rgba(0,0,0,1)'
        this.text = texts.join(' ');                    // 👈   change speed number here if needed
        this.speed = speed || 3                         // 👈   change speed number here if needed
        this.texts = []
        this.textObj = {
            text: null,
            start: 0,
            startDist: 0,
        }
        const observer = new ResizeObserver(entries => {
            this.observe(entries)
        })
        observer.observe(this.canvas.parentNode)

    }

    observe(entries) {
        window.cancelAnimationFrame(this.requestID);
        /** * Initial Start of Animation * **/
        this.loadValues(this.canvas)
    }


    animateCanvas(startAllAgain) {
        const canvas = this.canvas
        const ctx = this.ctx
        const texts = this.texts
        let length = texts.length
        let previous = 1                // 👈  start the next icon index for startAllAgain is false

        // Animate Icons
        function animate() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (let i = 0; i < length; i++) {
                const obj = texts[i]
                const startAgain = obj.startAgain
                const end = obj.end
                const offScreen = obj.offScreen
                const progress = obj.start += this.speed
                const x = obj.startDist + progress

                // True supplied for startAllAgain, will add as many items it can fit in canvas
                if (startAllAgain) {
                    if (x >= end) {
                        this.texts[i].start = 0
                        this.texts[i].startDist = -startAllAgain
                    }
                    if (x >= offScreen) {
                        this.texts[i].start = 0
                        this.texts[i].startDist = -startAllAgain
                    }

                } else {
                    /* Current word / sentence touches screen end or minus additonal padding, will
                        start the next word / sentence
                    */
                    if (x >= end) {
                        // console.log('end')
                        this.texts[previous].start = 0
                        previous = i
                        this.texts[i].end = undefined
                    }
                    /* Current word / sentence completely off screen, will
                       stop animating it and get ready to start again
                    */
                    if (x >= offScreen) {
                        // console.log('offScreen')
                        this.texts[i].start = undefined
                        this.texts[i].end = startAgain
                    }
                }

                /* Gradient fade on both sides */
                const grd = ctx.createLinearGradient(0, 0, canvas.width, 0);
                grd.addColorStop(0, this.rgba);

                grd.addColorStop(.1, this.textColor);
                grd.addColorStop(.9, this.textColor);
                grd.addColorStop(1, this.rgba);


                ctx.fillStyle = grd;
                ctx.fillText(obj.text, x, obj.textY);
            }
            this.requestID = requestAnimationFrame(animate.bind(this))
        }
        this.requestID = requestAnimationFrame(animate.bind(this))
    }

    /* Corrects pixel ratio for canvas items per screen size */
    createHiPPICanvas(w, h, canvas, ctx) {
        const ratio = window.devicePixelRatio;
        canvas.width = w * ratio;
        canvas.height = h * ratio;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.scale(ratio, ratio);
        return canvas;
    }

    /* canvas parent element */
    getCanvasWidth(el) {
        const { paddingLeft, paddingRight, marginLeft, marginRight } = window.getComputedStyle(el)
        let currentWidth = el.offsetWidth || window.innerWidth
        return currentWidth -= parseFloat(paddingLeft) + parseFloat(paddingRight) +
            parseFloat(marginLeft) + parseFloat(marginRight)
    }


    loadValues(canvasEl) {
        this.texts.length = 0
        const ctx = this.ctx
        const canvasWidth = this.getCanvasWidth(this.canvas.parentNode)

        /* window width devide by 25 + the font size you want */
        const fontSize = window.innerWidth / 25 + 35
        const canvas = this.createHiPPICanvas(canvasWidth, fontSize + 20, this.canvas, ctx)
        const text = this.text
        ctx.font = fontSize + "px Arial";
        const textObj = this.textObj

        const padding = this.padding
        const textMetrics = ctx.measureText(text);

        /* User adds fillWindow parameter to true
            allows text to fill the canvas as many 
            as it can fit
        */
        if (this.fillWindow) {
            const duplicateText = (text, canvasWidth) => {
                this.texts.push({ ...textObj })

                const pos = this.texts.reduce((startValues, obj) => {
                    let totalWidth = startValues.totalWidth

                    startValues.totalWidth += textMetrics.width
                    const padding = 20 * startValues.count++

                    if (totalWidth < canvasWidth * 2) {
                        startValues.startAllAgain = startValues.totalWidth - (canvas.width - padding)
                        obj.startDist = -(startValues.totalWidth + padding)
                        obj.text = text
                        obj.textY = textMetrics.fontBoundingBoxAscent
                        obj.end = canvas.width + padding
                        obj.offScreen = canvasWidth
                    }
                    return startValues
                }, { totalWidth: 0, startAllAgain: 0, count: 0 })

                /* Check if more room to duplicate text */
                if (pos.totalWidth < canvasWidth * 2) {
                    return duplicateText(text, canvasWidth)
                }
                this.animateCanvas(pos.startAllAgain)
            }
            return duplicateText(text, canvasWidth)
        }


        /* No fillWindow parameter or set to false
            allows text to only start showing again 
            when first word / letter starts to roll off screen
        */
        const pos = (textMetrics) => textMetrics.width > canvasWidth ? canvasWidth - padding : Math.abs(canvasWidth - textMetrics.width)
        const startAgain = pos(textMetrics)
        let len = 2

        while (len--) {
            this.texts.push({
                start: len ? 0 : undefined,
                startDist: -textMetrics.width,
                text: text,
                textY: textMetrics.fontBoundingBoxAscent,
                startAgain: startAgain,
                end: startAgain,
                offScreen: canvasWidth,
                opacity: 0
            })
        }

        this.animateCanvas()
    }
};


document.querySelectorAll('.canvas-carousel').forEach(canvas => {
    new AutoText(canvas)
})

