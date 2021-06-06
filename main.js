// このコードは https://qiita.com/KMim/items/930792c05b014f73f6dc の記事を一部参考に作成されています。
google.charts.load('current', {'packages':['corechart']});

let charts = ""

window.onload = function(){
    getMarkets(setOptionsHtmlForSymbols);
    recieveLiquidationMessage();
    charts = new Charts();
}

class Charts {
    main = new google.visualization.ComboChart(document.getElementById('appendMain'));
    volume = new google.visualization.ColumnChart(document.getElementById('appendVolume'));
    liquidationVolume = new google.visualization.BarChart(document.getElementById('appendLiquidationVolume'));
}

$('#btn').click(function(){
    let symbol = $('#symbol').val();
    let interval = $('#interval').val();
    let limit = $('#limit').val();
    getInfo(symbol, interval, limit, mainChart);
})

$('#linkBtn').click(function(){
    let symbol = $('#symbol').val();
    if (symbol.indexOf("_") === -1){
        symbol = symbol.toLowerCase();
    } else {
        symbol = symbol.split("_");
        symbol = symbol[0].toLowerCase() + "_quarter";
    }
    window.open('https://www.binance.com/ja/futures/' + symbol, '_blank');
})

function getInfo(symbol, interval, limit, callback){
    url = 'https://fapi.binance.com/fapi/v1/klines?symbol=' + symbol.toLowerCase() + '&interval=' + interval + '&limit=' + limit;
    ajaxGetRequests(url, callback);
}

function getMarkets(callback){
    ajaxGetRequests('https://fapi.binance.com/fapi/v1/exchangeInfo', callback);
}

function ajaxGetRequests(url, callback){
    $.ajax({
        url : url,
        type : 'GET',
        async : true,        
        cashe : false,     
        dataType : 'json',  
        contentType : 'application/json' 
    }).done(function(result){
        callback(result);
    }).fail(function(result){
        alert('Failed to load the information');
        console.log(result);
    });
}

function setOptionsHtmlForSymbols(result){
    let symbol = document.getElementById("symbol");
    document.createElement('option')
    for(let i = 0; i < result.symbols.length; i=(i+1)|0){
        let option = document.createElement('option');
        option.setAttribute('value', result.symbols[i].symbol);
        option.innerHTML = result.symbols[i].symbol;
        symbol.appendChild(option);
    };
    setInterval(reLoadsChart, 2000);
}

function mainChart(result){
    result = result.reverse()
    //チャートに描画するための最終的なデータを入れる
    let chartData = new google.visualization.DataTable();

    //日付ようにString型のカラムを一つ、チャート描画用に数値型のカラムを７つ作成
    chartData.addColumn('string');
    for(let x = 0;x < 7; x=(x+1)|0){
        chartData.addColumn('number');
    }
    //いちいち書くのが面倒なので、取得した情報の長さを配列に入れる
    let length = result.length;
    //描画用のデータを一時的に入れる
    let insertingData = new Array(length);
    //二次元配列aveに、平均線の日数と平均値を入れる
    let ave = new Array();
    //７日平均線用
    ave[0] = getSMA(result, 7);
    //25日平均線用
    ave[1] = getSMA(result, 25);
    //９９日平均線用
    ave[2] = getSMA(result, 99);

    //for文をまとめるため、出来高棒グラフの処理もここで行う
    //出来高を保持する配列
    let volume = new Array();
    //チャートの日付を保持する配列
    let dates = new Array();
    for(let s = 0; s < length; s=(s+1)|0){
        if(result[s][5] != ''){
            volume[s] = result[s][5];
            date = new Date(result[s][0]);
            // date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
            date = (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
            dates[s] = String(date);
        }
    }
    //配列insertingDataの中に、[安値、始値、高値、終値、７日移動平均線、２５日移動平均線、９９日移動平均線]の形で値を入れ込む
    for(let a = length - 1; a >= 0; a=(a-1)|0){
        insertingData[a] = [dates[a],parseFloat(result[a][3]),parseFloat(result[a][1]),parseFloat(result[a][4]),parseFloat(result[a][2]),ave[0][a],ave[1][a],ave[2][a]]
    }
    //チャート描画用の配列の中に、insertingDataの値を入れ込む
    //最古の50日分のデータまでは移動平均線のデータが揃っていないので、取り除く
    for (let i = 0; i < insertingData.length; i=(i+1)|0){
        chartData.addRow(insertingData[i]);
    }
    //チャートの見た目に関する記述、詳細は公式ドキュメントをご覧になってください
    let options = {
        chartArea:{left:10,top:10,right:80,bottom:10},
        colors: ["#003A76"],
        backgroundColor: "#EEE",
        legend: {
            position: "none",
        },
        vAxis:{
            format: 'short',
            viewWindowMode: "maximized"
        },
        hAxis: {
            textPosition: "none",
            direction: -1,
        },
        bar: { 
            groupWidth: "100%"
        },
        width: "100%",
        height: 350,
        lineWidth: 1,
        curveType: "function",
        //チャートのタイプとして、ローソク足を指定
        seriesType: "candlesticks",
        candlestick: {
            fallingColor: { strokeWidth: 1},
            risingColor: { strokeWidth: 1}
        },
        //ローソク足だでなく、線グラフも三種類表示することを記述
        series: {
            0:{
                targetAxisIndex: 1,
            },
            1:{
                type: "line",
                color: "green",
                targetAxisIndex: 1,
            },
            2:{
                type: "line",
                color: "red",
                targetAxisIndex: 1,
            },
            3:{
                type: "line",
                color: "orange",
                targetAxisIndex: 1,
            },
        } 
    };
    //描画の処理
    charts.main.clearChart();
    charts.main.draw(chartData, options);
    //出来高棒グラフを作成する関数を呼び出し
    volumeChart(volume, dates, length);
}

function getSMA(data, period){
    let sma = new Array();
    let divide = 0;
    let temp = 0;
    for(let m = 0; m < data.length - (period - 1); m=(m+1)|0){
        for(let n = 0; n < period; n=(n+1)|0){
            if(data[m+n][4] != ''){
                temp = temp + parseFloat(data[m+n][4]);
                divide++;
            }
        }
        sma[m] = temp / divide;
        temp = 0;
        divide = 0;
    }
    return sma;
}

function volumeChart(volume, dates, length){
    let chartData = new google.visualization.DataTable();
    //出来高の値と日付のためのカラムを作成
    chartData.addColumn('string');
    chartData.addColumn('number');
    let insertingData = new Array();
    //配列insertingDataの中に、[日付、出来高]の形式でデータを入れ込む
    for(let a = length - 1; a >= 0; a=(a-1)|0){
        insertingData[a] = [dates[a],parseInt(volume[a])]
    }
    //insertingDataの値をチャート描画用の変数に入れ込む
    for (let i = 0; i < insertingData.length; i=(i+1)|0){
        chartData.addRow(insertingData[i]);
    }
    //ローソク足の時と同じように、見た目の設定をする
    let options = {
        chartArea:{left:10,top:10,right:80,bottom:90},
        colors: ["#003A76"],
        backgroundColor: "#EEE",
        legend: {
            position: 'none',
        },
        bar: { 
            groupWidth: '100%' 
        },
        hAxis: {
            direction: -1,
            slantedTextAngle: -60,
        },
        width: "100%",
        height: 200,
        vAxis:{
            format: 'short',
            viewWindowMode:'maximized',
        },
        series: {
            0:{
                targetAxisIndex: 1,
            }
        }
    }
    charts.volume.clearChart();
    charts.volume.draw(chartData, options);
}

function liquidationVolumeChart(data){
    let chartData = new google.visualization.DataTable();
    chartData.addColumn('string');
    chartData.addColumn('number');
    //insertingDataの値をチャート描画用の変数に入れ込む
    let element = $("#ruler");
    let stringWidth = 0;
    let maxSymbolNameLength = 0;
    let maxQuantityLength = 0;
    for (let i = 0; i < data.length; i=(i+1)|0){
        chartData.addRow([data[i][0], data[i][3]]);
        stringWidth = element.text(data[i][0]).get(0).offsetWidth;
        if (stringWidth > maxSymbolNameLength) {
            maxSymbolNameLength = stringWidth;
        }
        stringWidth = element.text(data[i][3]).get(0).offsetWidth;
        if (stringWidth > maxQuantityLength) {
            maxQuantityLength = stringWidth;
        }
    }
    //ローソク足の時と同じように、見た目の設定をする
    let rem = 13;
    let height = rem * 4 + rem * 1.6 * data.length;
    let options = {
        chartArea:{left: maxSymbolNameLength + 5, top: 10, right: maxQuantityLength + 5, bottom: rem * 2},
        colors: ["#003A76"],
        backgroundColor: "#EEE",
        legend: {position: 'none'},
        height: height,
        width: "100%",
        hAxis: {},
        vAxis:{}
    }
    charts.liquidationVolume.clearChart();
    charts.liquidationVolume.draw(chartData, options);
}

function reLoadsChart(){
    let symbol = document.getElementById("symbol");
    let interval = document.getElementById("interval");
    let limit = document.getElementById("limit");
    getInfo(symbol.value, interval.value, limit.value, mainChart);
}

function recieveLiquidationMessage(){
    const URL = "https://www.binance.com/ja/futures/"
    const WEBSOCKET_URL = "wss://fstream.binance.com/ws/!forceOrder@arr"
    const MINIMUM_QUANTITY = 1
    const IGNORE_SYMBOLS = []

    let liquidationData = new Array()

    let connection = new WebSocket(WEBSOCKET_URL);

    connection.onmessage = function(event) {
        let message = JSON.parse(event.data);
        let timestamp = message["E"];
        let dt_obj = new Date(timestamp);
        let dt = dt_obj.getFullYear() + "-" + (dt_obj.getMonth() + 1) + "-" + dt_obj.getDate() + " " + dt_obj.getHours() + ":" + dt_obj.getMinutes() + ":" + dt_obj.getSeconds();
        let order = message["o"];
        let symbol = order["s"];
        let side = order["S"];
        let price = parseFloat(order["ap"]);
        let quantity = parseInt(price * parseFloat(order["z"]));
        if (side === "SELL" && symbol in IGNORE_SYMBOLS === false && quantity >= MINIMUM_QUANTITY) {
            let hasRecord = 0
            let date = new Date();
            for (let i = 0; i < liquidationData.length; i=(i+1)|0){
                if (liquidationData[i][0] === symbol) {
                    liquidationData[i] = [symbol, timestamp, price, liquidationData[i][3] + quantity];
                    hasRecord = 1
                }
                if (liquidationData[i][1] < date.getTime() - 360000) {
                    liquidationData[i][3] = 0;
                }
            }
            if (!hasRecord) {
                liquidationData.push([symbol, timestamp, price, quantity]);
            }
            liquidationData = liquidationData.filter(function(value) {
                return value[3] > 0;
            });
            liquidationVolumeChart(liquidationData);
            let ul = document.getElementById("messageList");
            let li = document.createElement("li");
            li.setAttribute("class", symbol)
            li.innerHTML = dt + " セール開催中! <a href='" + URL + symbol.replace("USDT", "_USDT") + "' target='_blank'>" + symbol + "</a> が破格の " + price + " USDTにて " + quantity + " USDT購入されています。";
            li.addEventListener('click', event => {
                let interval = document.getElementById("interval");
                let limit = document.getElementById("limit");
                getInfo(symbol, interval.value, limit.value, mainChart);
                let symbolOption = document.getElementById("symbol").getElementsByTagName("option");
                for(i=0; i < symbolOption.length; i=(i+1)|0){
                    if(symbolOption[i].value == symbol){
                        symbolOption[i].selected = true;
                    break;
                    }
                }
            });
            ul.prepend(li);
            let count = ul.childElementCount;
            if (count >= 20) {
                ul.removeChild(ul.lastElementChild)
            };
        };
    };
}
