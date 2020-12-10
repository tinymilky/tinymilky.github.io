var easymljs = easymljs || {VERSION: 'teachHaErLearnAI'};

// Following two functions are copied from convnetjs hhhh
(function (global) {
    "use strict";

    // Random number utilities
    var return_v = false;
    var v_val = 0.0;
    var gaussRandom = function () {
        if (return_v) {
            return_v = false;
            return v_val;
        }
        var u = 2 * Math.random() - 1;
        var v = 2 * Math.random() - 1;
        var r = u * u + v * v;
        if (r == 0 || r > 1) return gaussRandom();
        var c = Math.sqrt(-2 * Math.log(r) / r);
        v_val = v * c; // cache this
        return_v = true;
        return u * c;
    };
    var randf = function (a, b) {
        return Math.random() * (b - a) + a;
    };
    var randi = function (a, b) {
        return Math.floor(Math.random() * (b - a) + a);
    };
    var randn = function (mu, std) {
        return mu + gaussRandom() * std;
    };

    // Array utilities
    var zeros = function (n) {
        if (typeof(n) === 'undefined' || isNaN(n)) {
            return [];
        }
        if (typeof ArrayBuffer === 'undefined') {
            // lacking browser support
            var arr = new Array(n);
            for (var i = 0; i < n; i++) {
                arr[i] = 0;
            }
            return arr;
        } else {
            return new Float64Array(n);
        }
    };

    var arrContains = function (arr, elt) {
        for (var i = 0, n = arr.length; i < n; i++) {
            if (arr[i] === elt) return true;
        }
        return false;
    };

    var arrUnique = function (arr) {
        var b = [];
        for (var i = 0, n = arr.length; i < n; i++) {
            if (!arrContains(b, arr[i])) {
                b.push(arr[i]);
            }
        }
        return b;
    };

    // return max and min of a given non-empty array.
    var maxmin = function (w) {
        if (w.length === 0) {
            return {};
        } // ... ;s
        var maxv = w[0];
        var minv = w[0];
        var maxi = 0;
        var mini = 0;
        var n = w.length;
        for (var i = 1; i < n; i++) {
            if (w[i] > maxv) {
                maxv = w[i];
                maxi = i;
            }
            if (w[i] < minv) {
                minv = w[i];
                mini = i;
            }
        }
        return {
            maxi: maxi,
            maxv: maxv,
            mini: mini,
            minv: minv,
            dv: maxv - minv
        };
    };

    // create random permutation of numbers, in range [0...n-1]
    var randperm = function (n) {
        var i = n,
            j = 0,
            temp;
        var array = [];
        for (var q = 0; q < n; q++) array[q] = q;
        while (i--) {
            j = Math.floor(Math.random() * (i + 1));
            temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    };

    // sample from list lst according to probabilities in list probs
    // the two lists are of same size, and probs adds up to 1
    var weightedSample = function (lst, probs) {
        var p = randf(0, 1.0);
        var cumprob = 0.0;
        for (var k = 0, n = lst.length; k < n; k++) {
            cumprob += probs[k];
            if (p < cumprob) {
                return lst[k];
            }
        }
    };

    // syntactic sugar function for getting default parameter values
    var getopt = function (opt, field_name, default_value) {
        if (typeof field_name === 'string') {
            // case of single string
            return (typeof opt[field_name] !== 'undefined') ? opt[field_name] : default_value;
        } else {
            // assume we are given a list of string instead
            var ret = default_value;
            for (var i = 0; i < field_name.length; i++) {
                var f = field_name[i];
                if (typeof opt[f] !== 'undefined') {
                    ret = opt[f]; // overwrite return value
                }
            }
            return ret;
        }
    };

    function assert(condition, message) {
        if (!condition) {
            message = message || "Assertion failed";
            if (typeof Error !== "undefined") {
                throw new Error(message);
            }
            throw message; // Fallback
        }
    }

    global.randf = randf;
    global.randi = randi;
    global.randn = randn;
    global.zeros = zeros;
    global.maxmin = maxmin;
    global.randperm = randperm;
    global.weightedSample = weightedSample;
    global.arrUnique = arrUnique;
    global.arrContains = arrContains;
    global.getopt = getopt;
    global.assert = assert;

})(easymljs);

(function (global) {
    "use strict";

    // Vol is the basic building block of all data in a net.
    // it is essentially just a 3D volume of numbers, with a
    // width (sx), height (sy), and depth (depth).
    // it is used to hold data for all filters, all volumes,
    // all weights, and also stores all gradients w.r.t.
    // the data. c is optionally a value to initialize the volume
    // with. If c is missing, fills the Vol with random numbers.
    var Vol = function (sx, sy, depth, c) {
        // this is how you check if a variable is an array. Oh, Javascript :)
        if (Object.prototype.toString.call(sx) === '[object Array]') {
            // we were given a list in sx, assume 1D volume and fill it up
            this.sx = 1;
            this.sy = 1;
            this.depth = sx.length;
            // we have to do the following copy because we want to use
            // fast typed arrays, not an ordinary javascript array
            this.w = global.zeros(this.depth);
            this.dw = global.zeros(this.depth);
            for (var i = 0; i < this.depth; i++) {
                this.w[i] = sx[i];
            }
        } else {
            // we were given dimensions of the vol
            this.sx = sx;
            this.sy = sy;
            this.depth = depth;
            var n = sx * sy * depth;
            this.w = global.zeros(n);
            this.dw = global.zeros(n);
            if (typeof c === 'undefined') {
                // weight normalization is done to equalize the output
                // variance of every neuron, otherwise neurons with a lot
                // of incoming connections have outputs of larger variance
                var scale = Math.sqrt(1.0 / (sx * sy * depth));
                for (var i = 0; i < n; i++) {
                    this.w[i] = global.randn(0.0, scale);
                }
            } else {
                for (var i = 0; i < n; i++) {
                    this.w[i] = c;
                }
            }
        }
    };

    Vol.prototype = {
        get: function (x, y, d) {
            var ix = ((this.sx * y) + x) * this.depth + d;
            return this.w[ix];
        },
        set: function (x, y, d, v) {
            var ix = ((this.sx * y) + x) * this.depth + d;
            this.w[ix] = v;
        },
        add: function (x, y, d, v) {
            var ix = ((this.sx * y) + x) * this.depth + d;
            this.w[ix] += v;
        },
        get_grad: function (x, y, d) {
            var ix = ((this.sx * y) + x) * this.depth + d;
            return this.dw[ix];
        },
        set_grad: function (x, y, d, v) {
            var ix = ((this.sx * y) + x) * this.depth + d;
            this.dw[ix] = v;
        },
        add_grad: function (x, y, d, v) {
            var ix = ((this.sx * y) + x) * this.depth + d;
            this.dw[ix] += v;
        },
        cloneAndZero: function () {
            return new Vol(this.sx, this.sy, this.depth, 0.0)
        },
        clone: function () {
            var V = new Vol(this.sx, this.sy, this.depth, 0.0);
            var n = this.w.length;
            for (var i = 0; i < n; i++) {
                V.w[i] = this.w[i];
            }
            return V;
        },
        addFrom: function (V) {
            for (var k = 0; k < this.w.length; k++) {
                this.w[k] += V.w[k];
            }
        },
        addFromScaled: function (V, a) {
            for (var k = 0; k < this.w.length; k++) {
                this.w[k] += a * V.w[k];
            }
        },
        setConst: function (a) {
            for (var k = 0; k < this.w.length; k++) {
                this.w[k] = a;
            }
        },

        toJSON: function () {
            // todo: we may want to only save d most significant digits to save space
            var json = {};
            json.sx = this.sx;
            json.sy = this.sy;
            json.depth = this.depth;
            json.w = this.w;
            return json;
            // we wont back up gradients to save space
        },
        fromJSON: function (json) {
            this.sx = json.sx;
            this.sy = json.sy;
            this.depth = json.depth;

            var n = this.sx * this.sy * this.depth;
            this.w = global.zeros(n);
            this.dw = global.zeros(n);
            // copy over the elements.
            for (var i = 0; i < n; i++) {
                this.w[i] = json.w[i];
            }
        }
    };

    global.Vol = Vol;
})(easymljs);

(function (global) {
    "use strict";
    var Vol = global.Vol; // convenience

    // img is a DOM element that contains a loaded image
    // returns a Vol of size (W, H, 4). 4 is for RGBA
    var img_to_vol = function (img, convert_grayscale) {

        if (typeof(convert_grayscale) === 'undefined') var convert_grayscale = false;

        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");

        // due to a Firefox bug
        try {
            ctx.drawImage(img, 0, 0);
        } catch (e) {
            if (e.name === "NS_ERROR_NOT_AVAILABLE") {
                // sometimes happens, lets just abort
                return false;
            } else {
                throw e;
            }
        }

        try {
            var img_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            if (e.name === 'IndexSizeError') {
                return false; // not sure what causes this sometimes but okay abort
            } else {
                throw e;
            }
        }

        // prepare the input: get pixels and normalize them
        var p = img_data.data;
        var W = img.width;
        var H = img.height;
        var pv = [];
        for (var i = 0; i < p.length; i++) {
            pv.push(p[i] / 255.0 - 0.5); // normalize image pixels to [-0.5, 0.5]
        }
        var x = new Vol(W, H, 4, 0.0); //input volume (image)
        x.w = pv;

        if (convert_grayscale) {
            // flatten into depth=1 array
            var x1 = new Vol(W, H, 1, 0.0);
            for (var i = 0; i < W; i++) {
                for (var j = 0; j < H; j++) {
                    x1.set(i, j, 0, x.get(i, j, 0));
                }
            }
            x = x1;
        }
        return x;
    };

    var vol_to_array = function (vol) {
        var tn = vol.length;
        var arr = [];
        for (var i = 0; i < tn; i++) {
            var tm = vol[i].w.length;
            var tarr = [];
            for (var j = 0; j < tm; j++) {
                tarr.push(vol[i].w[j]);
            }
            arr.push(tarr);
        }
        return arr;
    };

    global.img_to_vol = img_to_vol;
    global.vol_to_array = vol_to_array;

})(easymljs);

(function (global) {
    "use strict";
    var Vol = global.Vol;
    var assert = global.assert;
    var randf = global.randf;

    var kmeans = function () {
        this.means = [];
        this.data = [];
        this.labels = [];
        this.N = 0;
        this.k = 0;
        this.dim = 0;
        this.ranges = [];
        this.loss = 0;
    };

    kmeans.prototype = {
        initMeans: function (k, dim, ranges) {
            assert(!(typeof(k) === 'undefined' || isNaN(k) || k < 1), 'Function Input Error, k must be a positive integer');
            assert(!(typeof(dim) === 'undefined' || isNaN(dim) || dim < 1), 'Function Input Error, dim must be a positive integer')

            this.k = k;
            this.dim = dim;
            this.ranges = ranges;

            if (!this.ranges) {
                this.ranges = [];
                for (var i = 0; i < dim; i++) {
                    var range = [];
                    range.push(0.0);
                    range.push(1.0);
                    this.ranges.push(range);
                }
            }

            while (k--) {
                var mean = new Vol(1, 1, dim);
                for (var i = 0; i < dim; i++) {
                    mean.w[i] = randf(this.ranges[i][0], this.ranges[i][1]);
                }
                this.means.push(mean);
            }
        },

        // assume we may add additional data samples, so when
        // assigning labels, we should feed new data
        assignLabels: function (data, labels) {
            // data[i] is a vol, and labels[i] is a scalar
            this.data = data;
            this.labels = labels;
            this.N = data.length;
            this.loss = 0;

            for (var i in data) {
                var point = this.data[i].w;
                var distances = [];

                for (var j in this.means) {
                    var mean = this.means[j].w;
                    var sum = 0;

                    for (var dimension in point) {
                        var difference = point[dimension] - mean[dimension];
                        difference *= difference;
                        sum += difference;
                    }
                    distances[j] = Math.sqrt(sum);
                    this.loss += distances[j];
                }
                this.labels[i] = distances.indexOf(Math.min.apply(null, distances));
            }
            this.loss /= this.N;
        },

        // As we have already got all the data we need
        // we just move our means.
        moveMeans: function () {

            var sums = new Array(this.k);
            var counts = new Array(this.k);

            for (var j = 0; j < this.k; j++) {
                counts[j] = 0;
                sums[j] = new Array(this.dim);
                for (var dimension in this.means[j].w) {
                    sums[j][dimension] = 0;
                }
            }

            for (var point_index in labels) {
                var mean_index = this.labels[point_index];
                var point = this.data[point_index].w;
                var mean = this.means[mean_index].w;

                counts[mean_index]++;
                for (var dimension in mean) {
                    sums[mean_index][dimension] += point[dimension];
                }
            }

            for (var mean_index in sums) {

                if (counts[mean_index] === 0) {
                    sums[mean_index] = this.means[mean_index];

                    for (var dimension in this.dim) {
                        sums[mean_index][dimension] = randf(ranges[i][0], ranges[i][1]);
                    }
                    continue;
                }
                for (var dimension in sums[mean_index]) {
                    sums[mean_index][dimension] /= counts[mean_index];
                }
            }
            for (var i = 0; i < this.k; i++) {
                this.means[i].w = sums[i];
            }
        },

        predictVector: function () {
            ;
        },

        predictSample: function (x) {

            var point = x.w;
            var distances = [];

            for (var j in this.means) {
                var mean = this.means[j].w;
                var sum = 0;

                for (var dimension in point) {
                    var difference = point[dimension] - mean[dimension];
                    difference *= difference;
                    sum += difference;
                }
                distances[j] = Math.sqrt(sum);
            }
            var label = distances.indexOf(Math.min.apply(null, distances));
            return label;
        }
    };

    global.kmeans = kmeans;

})(easymljs);

(function (global) {
    "use strict";
    var Vol = global.Vol;
    var assert = global.assert;
    var randf = global.randf;

    var convolution = function (opt) {
        var opt = opt || {};
    };

    convolution.prototype = {

        // input and filter must be a vol unit
        conv: function (input, filter, stride, pad) {

            var stride = typeof stride !== 'undefined' ? stride : 1;
            var pad = typeof pad !== 'undefined' ? pad : 0;

            var out_x = Math.floor((input.sx + pad * 2 - filter.sx) / stride + 1);
            var out_y = Math.floor((input.sy + pad * 2 - filter.sy) / stride + 1);
            var out_d = input.depth;

            var output = new Vol(out_x, out_y, out_d, 0);

            // Attention please
            // The index of canvas image.data starts from depth to y to x.

            for (var d = 0; d < out_d; d++) {
                var f = filter;
                var x = -pad;
                var y = -pad;
                for (var ay = 0; ay < out_y; y += stride, ay++) {
                    x = -pad;
                    for (var ax = 0; ax < out_x; x += stride, ax++) {
                        var a = 0.0;
                        for (var fy = 0; fy < f.sy; fy++) {
                            var oy = y + fy;
                            for (var fx = 0; fx < f.sx; fx++) {
                                var ox = x + fx;
                                if (oy >= 0 && oy < input.sy && ox >= 0 && ox < input.sx) {
                                    for (var fd = 0; fd < f.depth; fd++) {
                                        a += f.w[((f.sx * fy) + fx) * f.depth + fd] * input.w[((input.sx * oy) + ox) * input.depth + fd];
                                    }
                                }
                            }
                        }
                        output.set(ax, ay, d, a);
                    }
                }
            }
            return output;
        }
    };

    global.convolution = convolution;

})(easymljs);
