var layer_defs;
var net;
var trainer;
var tf = "layer_defs = [];";
var t =
"layer_defs.push({type:'input', out_sx:24, out_sy:24, out_depth:1});\n\
layer_defs.push({type:'conv', sx:3, filters:16, stride:1, pad:2, activation:'relu'});\n\
layer_defs.push({type:'pool', sx:3, stride:2});\n\
layer_defs.push({type:'conv', sx:3, filters:16, stride:1, pad:2, activation:'relu'});\n\
layer_defs.push({type:'pool', sx:3, stride:2});\n\
layer_defs.push({type:'softmax', num_classes:10});\n\ "

var te = "net = new convnetjs.Net();net.makeLayers(layer_defs);trainer = new convnetjs.SGDTrainer(net, {method:'adadelta', batch_size:20, l2_decay:0.001});"

// ------------------------
// BEGIN MNIST SPECIFIC STUFF
// ------------------------
classes_txt = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

var use_validation_data = true;
var sample_training_instance = function() {
    // find an unloaded batch
    var bi = Math.floor(Math.random() * loaded_train_batches.length);
    var b = loaded_train_batches[bi];
    var k = Math.floor(Math.random() * 3000); // sample within the batch
    var n = b * 3000 + k;

    // load more batches over time
    if (step_num % 5000 === 0 && step_num > 0) {
        for (var i = 0; i < num_batches; i++) {
            if (!loaded[i]) {
                // load it
                load_data_batch(i);
                break; // okay for now
            }
        }
    }

    // fetch the appropriate row of the training image and reshape into a Vol
    var p = img_data[b].data;
    var x = new convnetjs.Vol(28, 28, 1, 0.0);
    var W = 28 * 28;
    for (var i = 0; i < W; i++) {
        var ix = (W * k + i) * 4;
        x.w[i] = p[ix] / 255.0;
    }
    x = convnetjs.augment(x, 24);

    var isval = use_validation_data && n % 10 === 0 ? true : false;
    return {
        x: x,
        label: labels[n],
        isval: isval
    };
};

// sample a random testing instance
var sample_test_instance = function() {
    var b = 20;
    var k = Math.floor(Math.random() * 3000);
    var n = b * 3000 + k;

    var p = img_data[b].data;
    var x = new convnetjs.Vol(28, 28, 1, 0.0);
    var W = 28 * 28;
    for (var i = 0; i < W; i++) {
        var ix = (W * k + i) * 4;
        x.w[i] = p[ix] / 255.0;
    }
    var xs = [];
    for (var i = 0; i < 4; i++) {
        xs.push(convnetjs.augment(x, 24));
    }
    // return multiple augmentations, and we will average the network over them
    // to increase performance
    return {
        x: xs,
        label: labels[n]
    };
};

var num_batches = 21; // 20 training batches, 1 test
var data_img_elts = new Array(num_batches);
var img_data = new Array(num_batches);
var loaded = new Array(num_batches);
var loaded_train_batches = [];

// int main
$(window).load(function() {
    // $("#editor").val(t);
    editor.setValue(t);
    // eval($("#editor").val());
    eval(tf);
    eval(editor.getValue());
    eval(te);
    console.log(tf);
    console.log(t);
    console.log(te);


    update_net_param_display();

    for (var k = 0; k < loaded.length; k++) {
        loaded[k] = false;
    }

    load_data_batch(0); // async load train set batch 0 (6 total train batches)
    load_data_batch(20); // async load test set (batch 6)
    start_fun();
});

var start_fun = function() {
    if (loaded[0] && loaded[20]) {
        console.log("starting!");
        lossGraph.init(document.getElementById("lossgraph"));
        setInterval(load_and_step, 0); // lets go!
    } else {
        setTimeout(start_fun, 200);
    } // keep checking
};

var load_data_batch = function(batch_num) {
    // Load the dataset with JS in background
    data_img_elts[batch_num] = new Image();
    var data_img_elt = data_img_elts[batch_num];
    data_img_elt.onload = function() {
        var data_canvas = document.createElement("canvas");
        data_canvas.width = data_img_elt.width;
        data_canvas.height = data_img_elt.height;
        var data_ctx = data_canvas.getContext("2d");
        data_ctx.drawImage(data_img_elt, 0, 0); // copy it over... bit wasteful :(
        img_data[batch_num] = data_ctx.getImageData(
            0,
            0,
            data_canvas.width,
            data_canvas.height
        );
        loaded[batch_num] = true;
        if (batch_num < 20) {
            loaded_train_batches.push(batch_num);
        }
        console.log("finished loading data batch " + batch_num);
    };
    data_img_elt.src = "convnetjs_mnist/mnist/mnist_batch_" + batch_num + ".png";
};

// ------------------------
// END MNIST SPECIFIC STUFF
// ------------------------

var maxmin = cnnutil.maxmin;
var f2t = cnnutil.f2t;

// elt is the element to add all the canvas activation drawings into
// A is the Vol() to use
// scale is a multiplier to make the visualizations larger. Make higher for larger pictures
// if grads is true then gradients are used instead
var draw_activations = function(elt, A, scale, grads) {
    var s = scale || 2; // scale
    var draw_grads = false;
    if (typeof grads !== "undefined") draw_grads = grads;

    // get max and min activation to scale the maps automatically
    var w = draw_grads ? A.dw : A.w;
    var mm = maxmin(w);

    // create the canvas elements, draw and add to DOM
    for (var d = 0; d < A.depth; d++) {
        var canv = document.createElement("canvas");
        canv.className = "actmap";
        var W = A.sx * s;
        var H = A.sy * s;
        canv.width = W;
        canv.height = H;
        var ctx = canv.getContext("2d");
        var g = ctx.createImageData(W, H);

        for (var x = 0; x < A.sx; x++) {
            for (var y = 0; y < A.sy; y++) {
                if (draw_grads) {
                    var dval = Math.floor(
                        (A.get_grad(x, y, d) - mm.minv) / mm.dv * 255
                    );
                } else {
                    var dval = Math.floor(
                        (A.get(x, y, d) - mm.minv) / mm.dv * 255
                    );
                }
                for (var dx = 0; dx < s; dx++) {
                    for (var dy = 0; dy < s; dy++) {
                        var pp = (W * (y * s + dy) + (dx + x * s)) * 4;
                        for (var i = 0; i < 3; i++) {
                            g.data[pp + i] = dval;
                        } // rgb
                        g.data[pp + 3] = 255; // alpha channel
                    }
                }
            }
        }
        ctx.putImageData(g, 0, 0);
        elt.appendChild(canv);
    }
};

var visualize_activations = function(net, elt) {
    // clear the element
    elt.innerHTML = "";

    // show activations in each layer
    var N = net.layers.length;
    for (var i = 0; i < N; i++) {
        var L = net.layers[i];

        // visualize activations
        var activations_div = document.createElement("div");

        var tmp = document.createElement("div"); tmp.className = "statusName";
        // tmp.appendChild(document.createTextNode("激活层:"));
        activations_div.appendChild(tmp);
        activations_div.appendChild(document.createElement("br"));
        activations_div.className = "layer_act";
        var scale = 2;
        if (L.layer_type === "softmax" || L.layer_type === "fc") scale = 10; // for softmax
        activations_div.appendChild(
            document.createTextNode("Activations:")
        );
        activations_div.appendChild(
            document.createElement("br")
        );
        draw_activations(activations_div, L.out_act, scale);

        // visualize data gradients
        if (L.layer_type !== "softmax") {
            var grad_div = document.createElement("div");
            grad_div.appendChild(
                document.createTextNode("Activation Gradients:")
            );
            grad_div.appendChild(document.createElement("br"));
            grad_div.className = "layer_grad";
            var scale = 2;
            if (L.layer_type === "softmax" || L.layer_type === "fc") scale = 10; // for softmax
            draw_activations(grad_div, L.out_act, scale, true);
            activations_div.appendChild(grad_div);
        }
        
        // visualize filters if they are of reasonable size
        if (L.layer_type === "conv") {
            var filters_div = document.createElement("div");
            if (L.filters[0].sx > 2) {
                // actual weights
                filters_div.appendChild(document.createElement('br'));
                filters_div.appendChild(document.createTextNode('Weights:'));
                filters_div.appendChild(document.createElement('br'));
                for (var j = 0; j < L.filters.length; j++) {
                    filters_div.appendChild(document.createTextNode('('));
                    draw_activations(filters_div, L.filters[j], 3);
                    filters_div.appendChild(document.createTextNode(')'));
                }

                // gradients
                filters_div.appendChild(document.createElement('br'));
                filters_div.appendChild(document.createTextNode('Weight Gradients:'));
                filters_div.appendChild(document.createElement('br'));
                for (var j = 0; j < L.filters.length; j++) {
                    filters_div.appendChild(document.createTextNode('('));
                    draw_activations(filters_div, L.filters[j], 3, true);
                    filters_div.appendChild(document.createTextNode(')'));
                }
            } else {
                filters_div.appendChild(document.createTextNode('Weights hidden, too small'));
            }
            activations_div.appendChild(filters_div);
        }
        var layer_div = document.createElement("div");

        layer_div.appendChild(activations_div);

        // print some stats on left of the layer
        layer_div.className = "layer " + "lt" + L.layer_type;
        layer_div.className = "tutorialStatusPane";
        var title_div = document.createElement("div");
        title_div.className = "statusName";

        var c_layer_type;
        switch (L.layer_type) {
            case "input":
                c_layer_type = "Input";
                break;
            case "conv":
                c_layer_type = "Conv";
                break;
            case "pool":
                c_layer_type = "Pooling";
                break;
            case "fc":
                c_layer_type = "Fully Connected";
                break;
            case "softmax":
                c_layer_type = "Output ";
                break;
            case "relu":
                c_layer_type = "ReLU";
        }

        if((c_layer_type == "卷积核" && L.layer_type != "conv")||(c_layer_type=="全连接")){
            continue;
        }

        var t = c_layer_type;
        // var t =
        //     c_layer_type +
        //     " (" +
        //     L.out_sx +
        //     "x" +
        //     L.out_sy +
        //     "x" +
        //     L.out_depth +
        //     ")";
        title_div.appendChild(document.createElement("br"));
        title_div.appendChild(document.createTextNode(t));
        layer_div.appendChild(title_div);

        if (L.layer_type === "conv") {
            var t =
                "滤波器大小 " +
                L.filters[0].sx +
                "x" +
                L.filters[0].sy +
                "x" +
                L.filters[0].depth +
                ", stride " +
                L.stride;

            var tmp = document.createElement("div"); tmp.className = "statusName";
            // tmp.appendChild(document.createTextNode(t));
            layer_div.appendChild(tmp);
            // layer_div.appendChild(document.createElement("br"));
        }
        if (L.layer_type === "pool") {
            var t =
                "池化大小 " + L.sx + "x" + L.sy + ", stride " + L.stride;

            var tmp = document.createElement("div"); tmp.className = "statusName";
            // tmp.appendChild(document.createTextNode(t));

            layer_div.appendChild(tmp);
            layer_div.appendChild(document.createElement("br"));
        }

        // find min, max activations and display them
        // var mma = maxmin(L.out_act.w);
        // var t = "max activation: " + f2t(mma.maxv) + ", min: " + f2t(mma.minv);
        // layer_div.appendChild(document.createTextNode(t));
        // layer_div.appendChild(document.createElement("br"));
        //
        // var mma = maxmin(L.out_act.dw);
        // var t = "max gradient: " + f2t(mma.maxv) + ", min: " + f2t(mma.minv);
        // layer_div.appendChild(document.createTextNode(t));
        // layer_div.appendChild(document.createElement("br"));

        // number of parameters
        // if (L.layer_type === "conv") {
        //     var tot_params =
        //         L.sx * L.sy * L.in_depth * L.filters.length + L.filters.length;
        //     var t =
        //         "相关参数: " +
        //         L.filters.length +
        //         "x" +
        //         L.sx +
        //         "x" +
        //         L.sy +
        //         "x" +
        //         L.in_depth +
        //         "+" +
        //         L.filters.length +
        //         " = " +
        //         tot_params;
        //     var tmp = document.createElement("div"); tmp.className = "statusName";
        //     tmp.appendChild(document.createTextNode(t));
        //
        //     layer_div.appendChild(tmp);
        //     layer_div.appendChild(document.createElement("br"));
        // }
        // if (L.layer_type === "fc") {
        //     var tot_params = L.num_inputs * L.filters.length + L.filters.length;
        //     var t =
        //         "相关参数: " +
        //         L.filters.length +
        //         "x" +
        //         L.num_inputs +
        //         "+" +
        //         L.filters.length +
        //         " = " +
        //         tot_params;
        //     var tmp = document.createElement("div"); tmp.className = "statusName";
        //     tmp.appendChild(document.createTextNode(t));
        //
        //     layer_div.appendChild(tmp);
        //     layer_div.appendChild(document.createElement("br"));
        // }

        // css madness needed here...
        var clear = document.createElement("div");
        clear.className = "clear";
        layer_div.appendChild(clear);

        elt.appendChild(layer_div);
        elt.appendChild(document.createElement("br"));
    }
};

// loads a training image and trains on it with the network
var paused = false;
var load_and_step = function() {
    if (paused) return;

    var sample = sample_training_instance();
    step(sample); // process this image
};

// evaluate current network on test set
var test_predict = function() {
    var num_classes = net.layers[net.layers.length - 1].out_depth;

    document.getElementById("testset_acc").innerHTML = "";
    // grab a random test image
    for (num = 0; num < 9; num++) {
        var sample = sample_test_instance();
        var y = sample.label; // ground truth label

        // forward prop it through the network
        var aavg = new convnetjs.Vol(1, 1, num_classes, 0.0);
        // ensures we always have a list, regardless if above returns single item or list
        var xs = [].concat(sample.x);
        var n = xs.length;
        for (var i = 0; i < n; i++) {
            var a = net.forward(xs[i]);
            aavg.addFrom(a);
        }
        var preds = [];
        for (var k = 0; k < aavg.w.length; k++) {
            preds.push({
                k: k,
                p: aavg.w[k]
            });
        }
        preds.sort(function(a, b) {
            return a.p < b.p ? 1 : -1;
        });

        var div = document.createElement("div");
        div.className = "probsdiv";

        // draw the image into a canvas
        draw_activations(div, xs[0], 2); // draw Vol into canv

        // add predictions
        var probsdiv = document.createElement("div");
        // div.className = "probsdiv";
        var t = "";
        for (var k = 0; k < 3; k++) {
            var col = preds[k].k === y ? "rgb(85,187,85)" : "rgb(187,85,85)";
            t +=
                '<div class="pp" style="width:' +
                Math.floor(preds[k].p / n * 100) +
                "px; margin-left: 60px; background-color:" +
                col +
                ';">' +
                classes_txt[preds[k].k] +
                "</div>";
        }
        probsdiv.innerHTML = t;
        console.log(t);
        div.appendChild(probsdiv);

        // add it into DOM
        $("#testset_acc")
            .append(div)
            .fadeIn(1000);
    }
};

var lossGraph = new cnnvis.Graph();
var xLossWindow = new cnnutil.Window(100);
var wLossWindow = new cnnutil.Window(100);
var trainAccWindow = new cnnutil.Window(100);
var valAccWindow = new cnnutil.Window(100);
var step_num = 0;

var step = function(sample) {
    var x = sample.x;
    var y = sample.label;

    if (sample.isval) {
        // use x to build our estimate of validation error
        net.forward(x);
        var yhat = net.getPrediction();
        var val_acc = yhat === y ? 1.0 : 0.0;
        valAccWindow.add(val_acc);
        return; // get out
    }

    // train on it with network
    var stats = trainer.train(x, y);
    var lossx = stats.cost_loss;
    var lossw = stats.l2_decay_loss;

    // keep track of stats such as the average training error and loss
    var yhat = net.getPrediction();
    var train_acc = yhat === y ? 1.0 : 0.0;
    xLossWindow.add(lossx);
    wLossWindow.add(lossw);
    trainAccWindow.add(train_acc);

    // visualize training status
    // var train_elt = document.getElementById("trainstats");
    // train_elt.innerHTML = "";
    // var t = "Forward time per example: " + stats.fwd_time + "ms";
    // train_elt.appendChild(document.createTextNode(t));
    // train_elt.appendChild(document.createElement("br"));
    // var t = "Backprop time per example: " + stats.bwd_time + "ms";
    // train_elt.appendChild(document.createTextNode(t));
    // train_elt.appendChild(document.createElement("br"));
    // var t = "Classification loss: " + f2t(xLossWindow.get_average());
    // train_elt.appendChild(document.createTextNode(t));
    // train_elt.appendChild(document.createElement("br"));
    // var t = "L2 Weight decay loss: " + f2t(wLossWindow.get_average());
    // train_elt.appendChild(document.createTextNode(t));
    // train_elt.appendChild(document.createElement("br"));
    // var t = "Training accuracy: " + f2t(trainAccWindow.get_average());
    // train_elt.appendChild(document.createTextNode(t));
    // train_elt.appendChild(document.createElement("br"));
    // var t = "Validation accuracy: " + f2t(valAccWindow.get_average());
    // train_elt.appendChild(document.createTextNode(t));
    // train_elt.appendChild(document.createElement("br"));
    // var t = "Examples seen: " + step_num;
    // train_elt.appendChild(document.createTextNode(t));
    // train_elt.appendChild(document.createElement("br"));

    var fwd_time = document.getElementById("fwd_time");
    var t = stats.fwd_time + "ms";
    fwd_time.innerHTML = "";
    fwd_time.appendChild(document.createTextNode(t));
    fwd_time.appendChild(document.createElement("br"));

    var bwd_time = document.getElementById("bwd_time");
    var t = stats.bwd_time + "ms";
    bwd_time.innerHTML = "";
    bwd_time.appendChild(document.createTextNode(t));
    bwd_time.appendChild(document.createElement("br"));

    var step_num_c = document.getElementById("step_num");
    var t = step_num;
    step_num_c.innerHTML = "";
    step_num_c.appendChild(document.createTextNode(t));
    step_num_c.appendChild(document.createElement("br"));

    // var xLossWindow_c = document.getElementById("xLossWindow");
    // var t = f2t(xLossWindow.get_average());
    // xLossWindow_c.innerHTML = "";
    // xLossWindow_c.appendChild(document.createTextNode(t));
    // xLossWindow_c.appendChild(document.createElement("br"));
    //
    // var wLossWindow_c = document.getElementById("wLossWindow");
    // var t = f2t(wLossWindow.get_average());
    // wLossWindow_c.innerHTML = "";
    // wLossWindow_c.appendChild(document.createTextNode(t));
    // wLossWindow_c.appendChild(document.createElement("br"));

    var trainAccWindow_c = document.getElementById("trainAccWindow");
    var t = f2t(trainAccWindow.get_average());
    trainAccWindow_c.innerHTML = "";
    trainAccWindow_c.appendChild(document.createTextNode(t));
    trainAccWindow_c.appendChild(document.createElement("br"));

    var valAccWindow_c = document.getElementById("valAccWindow");
    var t = f2t(valAccWindow.get_average());
    valAccWindow_c.innerHTML = "";
    valAccWindow_c.appendChild(document.createTextNode(t));
    valAccWindow_c.appendChild(document.createElement("br"));

    // visualize activations
    if (step_num % 100 === 0) {
        var vis_elt = document.getElementById("visnet");
        visualize_activations(net, vis_elt);
    }

    // log progress to graph, (full loss)
    if (step_num % 200 === 0) {
        var xa = xLossWindow.get_average();
        var xw = wLossWindow.get_average();
        if (xa >= 0 && xw >= 0) {
            // if they are -1 it means not enough data was accumulated yet for estimates
            lossGraph.add(Math.floor(step_num / 200), 200, xa + xw);
            lossGraph.drawSample(document.getElementById("lossgraph"));
        }
    }

    // run prediction on test set
    if (step_num % 1000 === 0) {
        test_predict();
    }
    step_num++;
};

// user settings
var change_lr = function() {
    trainer.learning_rate = parseFloat(
        document.getElementById("lr_input").value
    );
    update_net_param_display();
};
var change_momentum = function() {
    trainer.momentum = parseFloat(
        document.getElementById("momentum_input").value
    );
    update_net_param_display();
};
var change_batch_size = function() {
    trainer.batch_size = parseFloat(
        document.getElementById("batch_size_input").value
    );
    update_net_param_display();
};
var change_decay = function() {
    trainer.l2_decay = parseFloat(document.getElementById("decay_input").value);
    update_net_param_display();
};
var update_net_param_display = function() {
    document.getElementById("lr_input").value = trainer.learning_rate;
    document.getElementById("momentum_input").value = trainer.momentum;
    document.getElementById("batch_size_input").value = trainer.batch_size;
    document.getElementById("decay_input").value = trainer.l2_decay;
};
var toggle_pause = function() {
    paused = !paused;
    var btn = document.getElementById("sendButton3");
    if (paused) {
        btn.innerHTML = "Continue Training";
    } else {
        btn.innerHTML = "Pause Training";
    }
};
var dump_json = function() {
    document.getElementById("dumpjson").value = JSON.stringify(net.toJSON());
};
var clear_graph = function() {
    lossGraph = new cnnvis.Graph(); // reinit graph too
    lossGraph.init(document.getElementById("lossgraph"));
};
var reset_all = function() {
    update_net_param_display();

    // reinit windows that keep track of val/train accuracies
    xLossWindow.reset();
    wLossWindow.reset();
    trainAccWindow.reset();
    valAccWindow.reset();
    lossGraph = new cnnvis.Graph(); // reinit graph too
    lossGraph.init(document.getElementById("lossgraph"));
    step_num = 0;
};
var load_from_json = function() {
    var jsonString = document.getElementById("dumpjson").value;
    var json = JSON.parse(jsonString);
    net = new convnetjs.Net();
    net.fromJSON(json);
    reset_all();
};
var change_net = function() {
    reset_all();
   
    eval(tf);
    eval(editor.getValue());
    eval(te);
    console.log(tf);
    console.log(t);
    console.log(te);


    update_net_param_display();

    for (var k = 0; k < loaded.length; k++) {
        loaded[k] = false;
    }

    load_data_batch(0); // async load train set batch 0 (6 total train batches)
    load_data_batch(20); // async load test set (batch 6)
    start_fun();

};
