// このコードは https://qiita.com/KMim/items/930792c05b014f73f6dc の記事を参考に作成されています。

window.onload = function(){
    getMarkets(setOptionsHtmlForSymbols);
    recieveLiquidationMessage();
}

google.charts.load('current', {'packages':['corechart']});

$('#btn').click(function(){
    let symbol = $('#symbol').val();
    let interval = $('#interval').val();
    let limit = $('#limit').val();
    getInfo(symbol, interval, limit, mainChart);
})

function getInfo(symbol, interval, limit, callback){
    let date = new Date();
    let now = date.getTime();
    interval = interval.split(":");
    url = 'https://fapi.binance.com/fapi/v1/klines?symbol=' + symbol.toLowerCase() + '&interval=' + interval[0] + '&startTime=' + (now - (interval[1] * 60 * 1000 * limit)) + '&endTime=' + now;
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
    for(let i = 0; i < result.symbols.length; i++){
        let option = document.createElement('option');
        option.setAttribute('value', result.symbols[i].symbol);
        option.innerHTML = result.symbols[i].symbol;
        symbol.appendChild(option);
    };
}

function mainChart(result){
    result = result.reverse()
    //チャートに描画するための最終的なデータを入れる
    let chartData = new google.visualization.DataTable();

    //日付ようにString型のカラムを一つ、チャート描画用に数値型のカラムを７つ作成
    chartData.addColumn('string');
    for(let x = 0;x < 7; x++){
        chartData.addColumn('number');
    }
    //いちいち書くのが面倒なので、取得した情報の長さを配列に入れる
    let length = result.length;
    //描画用のデータを一時的に入れる
    let insertingData = new Array(length);
    //平均を出すための割り算の分母
    let divide = 0;
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
    for(let s = 0; s < length; s++){
        if(result[s][5] != ''){
            volume[s] = result[s][5];
            date = new Date(result[s][0]);
            // date = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
            date = (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
            dates[s] = String(date);
        }
    }
    //配列insertingDataの中に、[安値、始値、高値、終値、７日移動平均線、２５日移動平均線、９９日移動平均線]の形で値を入れ込む
    for(let a = length - 1; a >= 0; a--){
        insertingData[a] = [dates[a],parseFloat(result[a][3]),parseFloat(result[a][1]),parseFloat(result[a][4]),parseFloat(result[a][2]),ave[0][a],ave[1][a],ave[2][a]]
    }
    //チャート描画用の配列の中に、insertingDataの値を入れ込む
    //最古の50日分のデータまでは移動平均線のデータが揃っていないので、取り除く
    for (let i = 0; i < insertingData.length; i++){
        chartData.addRow(insertingData[i]);
    }
    //チャートの見た目に関する記述、詳細は公式ドキュメントをご覧になってください
    let options = {
        chartArea:{left:10,top:10,right:80,bottom:10},
        colors: ['#003A76'],
        legend: {
            position: 'none',
        },
        vAxis:{
            viewWindowMode:'maximized'
        },
        hAxis: {
            direction: -1,
        },
        bar: { 
            groupWidth: '100%' 
        },
        width: "100%",
        height: 350,
        lineWidth: 2,
        curveType: 'function',
        //チャートのタイプとして、ローソク足を指定
        seriesType: "candlesticks",  
        //ローソク足だでなく、線グラフも三種類表示することを記述
        series: {
            0:{
                targetAxisIndex: 1,
            },
            1:{
                type: "line",
                color: 'green',
                targetAxisIndex: 1,
            },
            2:{
                type: "line",
                color: 'red',
                targetAxisIndex: 1,
            },
            3:{
                type: "line",
                color: 'orange',
                targetAxisIndex: 1,
            },
        } 
    };
    //描画の処理
    let chart = new google.visualization.ComboChart(document.getElementById('appendMain'));
    chart.draw(chartData, options);
    //出来高棒グラフを作成する関数を呼び出し
    volumeChart(volume, dates, length);
}

function getSMA(data, period){
    let sma = new Array();
    let divide = 0;
    let temp = 0;
    for(let m = 0; m < data.length - (period - 1); m++){
        for(let n = 0; n < period; n++){
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
    for(let a = length - 1; a >= 0; a--){
        insertingData[a] = [dates[a],parseInt(volume[a])]
    }
    //insertingDataの値をチャート描画用の変数に入れ込む
    for (let i = 0; i < insertingData.length; i++){
        chartData.addRow(insertingData[i]);
    }
    //ローソク足の時と同じように、見た目の設定をする
    let options = {
        chartArea:{left:10,top:10,right:80,bottom:100},
        colors: ['#003A76'],
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
            viewWindowMode:'maximized',
        },
        series: {
            0:{
                targetAxisIndex: 1,
            }
        }
    }
    let chart = new google.visualization.ColumnChart(document.getElementById('appendVolume'));
    chart.draw(chartData, options);
}

function recieveLiquidationMessage(){
    const URL = "https://www.binance.com/ja/futures/"
    const WEBSOCKET_URL = "wss://fstream.binance.com/ws/!forceOrder@arr"
    const MINIMUM_QUANTITY = 1000
    const IGNORE_SYMBOLS = []

    let connection = new WebSocket(WEBSOCKET_URL);

    connection.onmessage = function(event) {
        let message = JSON.parse(event.data);
        let dt_obj = new Date(message["E"]);
        let dt = dt_obj.getFullYear() + "-" + (dt_obj.getMonth() + 1) + "-" + dt_obj.getDate() + " " + dt_obj.getHours() + ":" + dt_obj.getMinutes() + ":" + dt_obj.getSeconds();
        let order = message["o"];
        let symbol = order["s"];
        let side = order["S"];
        let price = parseFloat(order["ap"]);
        let quantity = parseInt(price * parseFloat(order["z"]));
        if (side === "SELL" && symbol in IGNORE_SYMBOLS === false && quantity >= MINIMUM_QUANTITY) {
            let ul = document.getElementById("msgBox");
            let li = document.createElement("li");
            li.setAttribute("class", symbol)
            li.innerHTML = dt + " セール開催中! <a href='" + URL + symbol.replace("USDT", "_USDT") + "' target='_blank'>" + symbol + "</a> が破格の " + price + " USDTにて " + quantity + " USDT購入されています。";
            li.addEventListener('click', event => {
                let interval = document.getElementById("interval");
                let limit = document.getElementById("limit");
                getInfo(symbol, interval.value, limit.value, mainChart);
                let symbolOption = document.getElementById("symbol").getElementsByTagName("option");
                for(i=0; i < symbolOption.length; i++){
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