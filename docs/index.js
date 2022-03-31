// ベースマップを作成する
// ここでは3DのOpenStreetMapを表示する
var readDisaportaldata = true;

var map = new maplibregl.Map({
    container: 'map',
    style: readDisaportaldata ? 'style.json' : 'style_normal.json',
    center: [129.768337, 32.986804],
    zoom: 15,
    hash: true,
    pitch: 30,
    localIdeographFontFamily: false
})

// UIツール
// 右下のズームレベルの＋−ボタンを表示する
map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
// 右上の現在位置の取得ボタンを表示する
map.addControl(new maplibregl.GeolocateControl({positionOptions: {enableHighAccuracy: true}, trackUserLocation: true}), 'top-right');
// 左下の尺度を表示する
map.addControl(new maplibregl.ScaleControl());

// URLを取得
const url = new URL(window.location.href);

// URLSearchParamsオブジェクトを取得
const params = url.searchParams;

// getメソッド
const areaCode = params.get('areaCode');
const lat = params.get('lat');
const lon = params.get('lon');
const context = "./data/gml/datalist";

if (lat !== null && lon !== null) {
    map.setCenter([lon, lat]);
}

// 画面がロードされたら地図にレイヤを追加する
map.on('load', function () {
});

var shelterLoaded = false;
var check = document.getElementById('shelter');
check.onchange = function () {
    var value = this.checked;

    if (value === true && shelterLoaded === false) {
        // 避難所情報レイヤを追加
        $.getJSON("./data/shelter.json", {},
                function (json) {
                    shelterLoaded = true;
                    var features = json.features;
                    var filtered = features.filter(function (feature) {
                        return areaCode === null || areaCode === '' || feature.properties.P20_001.startsWith(areaCode);
                    });
                    json.features = filtered;

                    map.addSource('shelter_point', {
                        type: 'geojson',
                        data: json
                    });
                    map.loadImage(
                            './img/shelter.png',
                            function (error, image) {
                                if (error)
                                    throw error;
                                map.addImage('shelter_icon', image);
                            }
                    );

                    map.addLayer({
                        'id': 'shelter_point',
                        'type': 'symbol',
                        'source': 'shelter_point',
                        'layout': {
                            'icon-image': 'shelter_icon',
                            'icon-size': 0.1
                        }
                    });

                    // 避難所情報の地物をクリックしたときに、コメントを表示する
                    map.on('click', 'shelter_point', function (e) {
                        var coordinates = e.features[0].geometry.coordinates.slice();
                        var name = e.features[0].properties.P20_002;
                        var comment = e.features[0].properties.comment;
                        name += '<br><a href=\"https://www.google.com/maps/dir/?api=1&destination='
                                + e.features[0].geometry.coordinates.slice()[1]
                                + ','
                                + e.features[0].geometry.coordinates.slice()[0]
                                + '\" target=\"_blank\">'
                                + '避難所迄のルートを検索</a>';
                        if (comment != null) {
                            name += '<br>' + comment;
                        }

                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }

                        // ポップアップを表示する
                        new maplibregl.Popup()
                                .setLngLat(coordinates)
                                .setHTML(name)
                                .addTo(map);

                        // 避難所情報欄に避難所名を記載する
                        var infoName = $("#info-name")[0];
                        infoName.innerHTML = e.features[0].properties.P20_002;

                        var info = $("#info-comment")[0];
                        var infoComment = '<table><tr><td>施設の種類</td><td>' + e.features[0].properties.P20_004 + '</td></tr>'
                                + '<tr><td>地震災害</td><td>' + (e.features[0].properties.P20_007 === 1 ? '〇' : '×') + '</td></tr>'
                                + '<tr><td>津波災害</td><td>' + (e.features[0].properties.P20_008 === 1 ? '〇' : '×') + '</td></tr>'
                                + '<tr><td>水害</td><td>' + (e.features[0].properties.P20_009 === 1 ? '〇' : '×') + '</td></tr>'
                                + '<tr><td>火山災害</td><td>' + (e.features[0].properties.P20_010 === 1 ? '〇' : '×') + '</td></tr>'
                                + '<tr><td>その他</td><td>' + (e.features[0].properties.P20_011 === 1 ? '〇' : '×') + '</td></tr>'
                                + '<tr><td>指定なし</td><td>' + (e.features[0].properties.P20_012 === 1 ? '〇' : '×') + '</td></tr>'
                                + '</table>';
                        info.innerHTML = infoComment;

                    });
                });
    }
    if (shelterLoaded) {
        if (value === true) {
            map.setLayoutProperty('shelter_point', 'visibility', 'visible');
        } else {
            map.setLayoutProperty('shelter_point', 'visibility', 'none');
        }
    }
}

// 災害危険区域レイヤを追加
var a48Loaded = false;
check = document.getElementById('a48');
check.onchange = function () {
    var value = this.checked;
    if (value === true && a48Loaded === false) {
        $.getJSON(context + '/A48/a48.json', {},
                function (json) {
                    a48Loaded = true;
                    var features = json.features;
                    var filtered = features.filter(function (feature) {
                        return areaCode === null || areaCode === '' || feature.properties.A48_003.startsWith(areaCode);
                    });
                    json.features = filtered;

                    map.addSource('a48', {
                        type: 'geojson',
                        data: json
                    });
                    map.addLayer({
                        'id': 'a48',
                        'type': 'fill',
                        'source': 'a48',
                        "paint": {
                            "fill-antialias": false,
                            "fill-color": "rgba(0, 0, 0, 1)",
                            "fill-opacity": 0.5
                        }
                    });

                    map.on('click', 'a48', function (e) {
                        console.log("click")

                        var coordinates;
                        if (e.features[0].geometry.type === 'Polygon') {
                            coordinates = e.features[0].geometry.coordinates[0][0].slice();
                        } else if (e.features[0].geometry.type === 'MultiPolygon') {
                            coordinates = e.features[0].geometry.coordinates[0][0][0].slice();
                        } else if (e.features[0].geometry.type === 'LineString') {
                            coordinates = e.features[0].geometry.coordinates[0].slice();
                        } else if (e.features[0].geometry.type === 'MultiLineString') {
                            coordinates = e.features[0].geometry.coordinates[0][0].slice();
                        }
                        var html = e.features[0].properties.A48_005;

                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }

                        // ポップアップを表示する
                        new maplibregl.Popup()
                                .setLngLat(coordinates)
                                .setHTML(html)
                                .addTo(map);

                        var infoName = $("#info-name")[0];
                        infoName.innerHTML = e.features[0].properties.A48_005;

                        var info = $("#info-comment")[0];
                        var infoComment = '<table>'
                                + '<tr><td>都道府県名</td><td>' + e.features[0].properties.A48_001 + '</td></tr>'
                                + '<tr><td>市町村名</td><td>' + e.features[0].properties.A48_002 + '</td></tr>'
                                + '<tr><td>代表行政コード</td><td>' + e.features[0].properties.A48_003 + '</td></tr>'
                                + '<tr><td>指定主体区分</td><td>' + e.features[0].properties.A48_004 + '('
                                + (e.features[0].properties.A48_004 === 1 ? '都道府県' :
                                        (e.features[0].properties.A48_004 === 2 ? '市町村' : ''))
                                + ')</td></tr>'
                                + '<tr><td>区域名</td><td>' + e.features[0].properties.A48_005 + '</td></tr>'
                                + '<tr><td>所在地</td><td>' + e.features[0].properties.A48_006 + '</td></tr>'
                                + '<tr><td>指定理由コード</td><td>' + e.features[0].properties.A48_007 + '('
                                + (e.features[0].properties.A48_007 === 1 ? '水害(河川)' :
                                        (e.features[0].properties.A48_007 === 2 ? '水害(海)' :
                                                (e.features[0].properties.A48_007 === 3 ? '水害(河川・海)' :
                                                        (e.features[0].properties.A48_007 === 4 ? '急傾斜地崩壊等' :
                                                                (e.features[0].properties.A48_007 === 5 ? '地すべり等' :
                                                                        (e.features[0].properties.A48_007 === 6 ? '火山被害' :
                                                                                (e.features[0].properties.A48_007 === 7 ? 'その他' : '')))))))
                                + ')</td></tr>'
                                + '<tr><td>指定理由詳細</td><td>' + e.features[0].properties.A48_008 + '</td></tr>'
                                + '<tr><td>告示年月日</td><td>' + e.features[0].properties.A48_009 + '</td></tr>'
                                + '<tr><td>告示番号</td><td>' + e.features[0].properties.A48_010 + '</td></tr>'
                                + '<tr><td>根拠条例</td><td>' + e.features[0].properties.A48_011 + '</td></tr>'
                                + '<tr><td>面積</td><td>' + e.features[0].properties.A48_012 + 'ha</td></tr>'
                                + '<tr><td>縮尺</td><td>' + e.features[0].properties.A48_013 + '</td></tr>'
                                + '<tr><td>その他</td><td>' + e.features[0].properties.A48_014 + '</td></tr>'
                                + '</table>';
                        info.innerHTML = infoComment;
                    });
                });
    }
    if (a48Loaded) {
        if (value === true) {
            map.setLayoutProperty('a48', 'visibility', 'visible');
        } else {
            map.setLayoutProperty('a48', 'visibility', 'none');
        }
    }
}

// 国・都道府県の機関データを追加
var p28Loaded = false;
check = document.getElementById('p28');
check.onchange = function () {
    var value = this.checked;
    if (value === true && p28Loaded === false) {
        // 国・都道府県の機関データを追加
        $.getJSON(context + '/P28/P28-13.geojson', {},
                function (json) {
                    p28Loaded = true;
                    var features = json.features;
                    var filtered = features.filter(function (feature) {
                        return areaCode === null || areaCode === '' || feature.properties.P28_001.startsWith(areaCode);
                    });
                    json.features = filtered;

                    map.addSource('p28', {
                        type: 'geojson',
                        data: json
                    });
                    map.addLayer({
                        'id': 'p28',
                        'type': 'circle',
                        'source': 'p28',
                        "paint": {
                            "circle-color": "rgba(0, 255, 0, 1)"
                        }
                    });
                    map.on('click', 'p28', function (e) {
                        var coordinates = e.features[0].geometry.coordinates.slice();
                        var html = e.features[0].properties.P28_005;

                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }

                        // ポップアップを表示する
                        new maplibregl.Popup()
                                .setLngLat(coordinates)
                                .setHTML(html)
                                .addTo(map);
                        var infoName = $("#info-name")[0];
                        infoName.innerHTML = e.features[0].properties.P28_005;

                        var info = $("#info-comment")[0];
                        var infoComment = '<table>'
                                + '<tr><td>行政区域コード</td><td>' + e.features[0].properties.P28_001 + '</td></tr>'
                                + '<tr><td>公共施設大分類</td><td>' + e.features[0].properties.P28_002 + '('
                                + (e.features[0].properties.P28_002 === '3' ? '建物' :
                                        (e.features[0].properties.P28_002 === '9' ? 'その他' :
                                                (e.features[0].properties.P28_002 === '11' ? '国の機関' :
                                                        (e.features[0].properties.P28_002 === '12' ? '地方公共団体' :
                                                                (e.features[0].properties.P28_002 === '13' ? '厚生機関' :
                                                                        (e.features[0].properties.P28_002 === '14' ? '警察機関' :
                                                                                (e.features[0].properties.P28_002 === '15' ? '消防署' :
                                                                                        (e.features[0].properties.P28_002 === '16' ? '学校' :
                                                                                                (e.features[0].properties.P28_002 === '17' ? '病院' :
                                                                                                        (e.features[0].properties.P28_002 === '18' ? '郵便局' :
                                                                                                                (e.features[0].properties.P28_002 === '19' ? '福祉施設' : '')))))))))))
                                + ')</td></tr>'
                                + '<tr><td>公共施設小分類</td><td>' + e.features[0].properties.P28_003 + '('
                                + (e.features[0].properties.P28_003 === '03001' ? '美術館' :
                                        (e.features[0].properties.P28_003 === '03002' ? '資料館，記念館，博物館，科学館' :
                                                (e.features[0].properties.P28_003 === '03003' ? '図書館' :
                                                        (e.features[0].properties.P28_003 === '03004' ? '水族館' :
                                                                (e.features[0].properties.P28_003 === '03005' ? '動植物園' :
                                                                        (e.features[0].properties.P28_003 === '09001' ? '公共企業体・政府関係機関' :
                                                                                (e.features[0].properties.P28_003 === '09002' ? '独立行政法人・大学共同利用機関法人' :
                                                                                        (e.features[0].properties.P28_003 === '11100' ? '国会' :
                                                                                                (e.features[0].properties.P28_003 === '11101' ? '会計検査院' :
                                                                                                        (e.features[0].properties.P28_003 === '11102' ? '人事院' :
                                                                                                                (e.features[0].properties.P28_003 === '11103' ? '内閣法制局' :
                                                                                                                        (e.features[0].properties.P28_003 === '11110' ? '内閣府' :
                                                                                                                                (e.features[0].properties.P28_003 === '11111' ? '内閣官房' :
                                                                                                                                        (e.features[0].properties.P28_003 === '11112' ? '宮内庁' :
                                                                                                                                                (e.features[0].properties.P28_003 === '11113' ? '金融庁' :
                                                                                                                                                        (e.features[0].properties.P28_003 === '11114' ? '公正取引委員会' :
                                                                                                                                                                (e.features[0].properties.P28_003 === '11120' ? '国家公安委員会' :
                                                                                                                                                                        (e.features[0].properties.P28_003 === '11121' ? '警察庁' :
                                                                                                                                                                                (e.features[0].properties.P28_003 === '11130' ? '防衛庁' :
                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11131' ? '防衛施設庁' :
                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11140' ? '総務省' :
                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11142' ? '消防庁' :
                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11144' ? '公害等調整委員会' :
                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11150' ? '法務省' :
                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11151' ? '検察庁' :
                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11152' ? '公安調査庁' :
                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11153' ? '公安審査委員会' :
                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11160' ? '外務省' :
                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11161' ? '外国公館' :
                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11170' ? '財務省' :
                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11171' ? '国税庁' :
                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11180' ? '文部科学省' :
                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11181' ? '文化庁' :
                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11190' ? '厚生労働省' :
                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11191' ? '社会保険庁' :
                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11192' ? '中央労働委員会' :
                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11200' ? '農林水産省' :
                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11202' ? '林野庁' :
                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11203' ? '水産庁' :
                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11210' ? '経済産業省' :
                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11211' ? '資源エネルギー庁' :
                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11212' ? '特許庁' :
                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11213' ? '中小企業庁' :
                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11220' ? '国土交通省' :
                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11221' ? '海上保安庁' :
                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11222' ? '海難審判庁' :
                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11223' ? '気象庁' :
                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11224' ? '船員労働委員会' :
                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '11230' ? '環境省' :
                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '11240' ? '裁判所' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '12001' ? '都道府県庁' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '12002' ? '区役所（東京都），市役所' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '12003' ? '区役所（政令指定都市）' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '12004' ? '町村役場' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '12005' ? '都道府県の出先機関' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '13001' ? '保健所' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '16001' ? '小学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '16002' ? '中学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '16003' ? '中等教育学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '16004' ? '高等学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '16005' ? '高等専門学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '16006' ? '短期大学' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '16007' ? '大学' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '16008' ? '盲学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '16009' ? 'ろう学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '16010' ? '養護学校' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '18001' ? '普通郵便局' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '18002' ? '特定郵便局（集配局）' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '18003' ? '特定郵便局（無集配局）' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_003 === '18004' ? '簡易郵便局' :
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_003 === '18005' ? '地域区分局' : '')))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))
                                + ')</td></tr>'
                                + '<tr><td>国・都道府県の機関分類</td><td>' + e.features[0].properties.P28_004 + '('
                                + (e.features[0].properties.P28_004 === '09001' ? '公共企業体・政府関係機関' :
                                        (e.features[0].properties.P28_004 === '09002' ? '独立行政法人・大学共同利用機関法人' :
                                                (e.features[0].properties.P28_004 === '11100' ? '国会' :
                                                        (e.features[0].properties.P28_004 === '11101' ? '会計検査院' :
                                                                (e.features[0].properties.P28_004 === '11102' ? '人事院' :
                                                                        (e.features[0].properties.P28_004 === '11103' ? '内閣法制局' :
                                                                                (e.features[0].properties.P28_004 === '11110' ? '内閣府' :
                                                                                        (e.features[0].properties.P28_004 === '11111' ? '内閣官房' :
                                                                                                (e.features[0].properties.P28_004 === '11112' ? '宮内庁' :
                                                                                                        (e.features[0].properties.P28_004 === '11113' ? '金融庁' :
                                                                                                                (e.features[0].properties.P28_004 === '11114' ? '公正取引委員会' :
                                                                                                                        (e.features[0].properties.P28_004 === '11115' ? '消費者庁' :
                                                                                                                                (e.features[0].properties.P28_004 === '11116' ? '復興庁' :
                                                                                                                                        (e.features[0].properties.P28_004 === '11120' ? '国家公安委員会' :
                                                                                                                                                (e.features[0].properties.P28_004 === '11121' ? '警察庁' :
                                                                                                                                                        (e.features[0].properties.P28_004 === '11132' ? '防衛省' :
                                                                                                                                                                (e.features[0].properties.P28_004 === '11140' ? '総務省' :
                                                                                                                                                                        (e.features[0].properties.P28_004 === '11142' ? '消防庁' :
                                                                                                                                                                                (e.features[0].properties.P28_004 === '11144' ? '公害等調整委員会' :
                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11150' ? '法務省' :
                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11151' ? '検察庁' :
                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11152' ? '公安調査庁' :
                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11153' ? '公安審査委員会' :
                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11160' ? '外務省' :
                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11161' ? '外国公館' :
                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11170' ? '財務省' :
                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11171' ? '国税庁' :
                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11180' ? '文部科学省' :
                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11181' ? '文化庁' :
                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11190' ? '厚生労働省' :
                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11192' ? '中央労働委員会' :
                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11200' ? '農林水産省' :
                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11202' ? '林野庁' :
                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11203' ? '水産庁' :
                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11210' ? '経済産業省' :
                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11211' ? '資源エネルギー庁' :
                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11212' ? '特許庁' :
                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11213' ? '中小企業庁' :
                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11220' ? '国土交通省' :
                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11221' ? '海上保安庁' :
                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11223' ? '気象庁' :
                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11225' ? '観光庁' :
                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11226' ? '運輸安全委員会' :
                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11227' ? '海難審判所' :
                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11230' ? '環境省' :
                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '11231' ? '原子力規制委員会' :
                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '11240' ? '裁判所' :
                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '12001' ? '都道府県庁' :
                                                                                                                                                                                                                                                                                                                                                                                                                                (e.features[0].properties.P28_004 === '12005' ? '都道府県の出先機関' :
                                                                                                                                                                                                                                                                                                                                                                                                                                        (e.features[0].properties.P28_004 === '13001' ? '保健所' : ''))))))))))))))))))))))))))))))))))))))))))))))))))
                                + ')</td></tr>'
                                + '<tr><td>名称</td><td>' + e.features[0].properties.P28_005 + '</td></tr>'
                                + '<tr><td>所在地</td><td>' + e.features[0].properties.P28_006 + '</td></tr>'
                                + '<tr><td>管理者コード</td><td>' + e.features[0].properties.P28_007 + '('
                                + (e.features[0].properties.P28_007 === 1 ? '国' :
                                        (e.features[0].properties.P28_007 === 2 ? '都道府県' :
                                                (e.features[0].properties.P28_007 === 3 ? '市区町村' :
                                                        (e.features[0].properties.P28_007 === 4 ? '民間' :
                                                                (e.features[0].properties.P28_007 === 0 ? 'その他' : '')))))
                                + ')</td></tr>'
                                + '</table>';
                        info.innerHTML = infoComment;
                    });
                });
    }
    if (p28Loaded) {
        if (value === true) {
            map.setLayoutProperty('p28', 'visibility', 'visible');
        } else {
            map.setLayoutProperty('p28', 'visibility', 'none');
        }
    }
}

// 鉄道データを追加
var n02Loaded = false;
check = document.getElementById('n02');
check.onchange = function () {
    var value = this.checked;
    if (value === true && n02Loaded === false) {
        // 鉄道データを追加
        $.getJSON(context + '/N02/N02-20_RailroadSection.geojson', {},
                function (json) {
//                var features = json.features;
//                var filtered = features.filter(function (feature) {
//                    return feature.properties.P28_001.startsWith(areaCode);
//                });
//                json.features = filtered;

                    map.addSource('n02RailroadSection', {
                        type: 'geojson',
                        data: json
                    });
                    map.addLayer({
                        'id': 'n02RailroadSection',
                        'type': 'line',
                        'source': 'n02RailroadSection',
                        "paint": {
                            "line-color": "rgba(0, 200, 0, 1)"
                        }
                    });
                    map.on('click', 'n02RailroadSection', function (e) {
                        console.log("click")

                        var coordinates;
                        if (e.features[0].geometry.type === 'Polygon') {
                            coordinates = e.features[0].geometry.coordinates[0][0].slice();
                        } else if (e.features[0].geometry.type === 'MultiPolygon') {
                            coordinates = e.features[0].geometry.coordinates[0][0][0].slice();
                        } else if (e.features[0].geometry.type === 'LineString') {
                            coordinates = e.features[0].geometry.coordinates[0].slice();
                        } else if (e.features[0].geometry.type === 'MultiLineString') {
                            coordinates = e.features[0].geometry.coordinates[0][0].slice();
                        }
                        var html = e.features[0].properties.N02_003;

                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }

                        // ポップアップを表示する
                        new maplibregl.Popup()
                                .setLngLat(coordinates)
                                .setHTML(html)
                                .addTo(map);
                        var infoName = $("#info-name")[0];
                        infoName.innerHTML = e.features[0].properties.N02_003;

                        var info = $("#info-comment")[0];
                        var infoComment = '<table>'
                                + '<tr><td>鉄道区分</td><td>' + e.features[0].properties.N02_001 + '('
                                + (e.features[0].properties.N02_001 === '11' ? '普通鉄道JR' :
                                        (e.features[0].properties.N02_001 === '12' ? '普通鉄道' :
                                                (e.features[0].properties.N02_001 === '13' ? '鋼索鉄道' :
                                                        (e.features[0].properties.N02_001 === '14' ? '懸垂式鉄道' :
                                                                (e.features[0].properties.N02_001 === '15' ? '跨座式鉄道' :
                                                                        (e.features[0].properties.N02_001 === '16' ? '案内軌条式鉄道' :
                                                                                (e.features[0].properties.N02_001 === '17' ? '無軌条鉄道' :
                                                                                        (e.features[0].properties.N02_001 === '21' ? '軌道' :
                                                                                                (e.features[0].properties.N02_001 === '22' ? '懸垂式モノレール' :
                                                                                                        (e.features[0].properties.N02_001 === '23' ? '跨座式モノレール' :
                                                                                                                (e.features[0].properties.N02_001 === '24' ? '案内軌条式' :
                                                                                                                        (e.features[0].properties.N02_001 === '25' ? '浮上式' : ''))))))))))))
                                + ')</td></tr>'
                                + '<tr><td>事業者種別</td><td>' + e.features[0].properties.N02_002 + '('
                                + (e.features[0].properties.N02_002 === '1' ? 'JRの新幹線' :
                                        (e.features[0].properties.N02_002 === '2' ? 'JR在来線' :
                                                (e.features[0].properties.N02_002 === '3' ? '公営鉄道' :
                                                        (e.features[0].properties.N02_002 === '4' ? '民営鉄道' :
                                                                (e.features[0].properties.N02_002 === '5' ? '第三セクター' : '')))))
                                + ')</td></tr>'
                                + '<tr><td>路線名</td><td>' + e.features[0].properties.N02_003 + '</td></tr>'
                                + '<tr><td>運営会社</td><td>' + e.features[0].properties.N02_004 + '</td></tr>'
                                + '</table>';
                        info.innerHTML = infoComment;
                    });
                    $.getJSON(context + '/N02/N02-20_Station.geojson', {},
                            function (json) {
                                n02Loaded = true;
//                var features = json.features;
//                var filtered = features.filter(function (feature) {
//                    return feature.properties.P28_001.startsWith(areaCode);
//                });
//                json.features = filtered;

                                map.addSource('n02Station', {
                                    type: 'geojson',
                                    data: json
                                });
                                map.addLayer({
                                    'id': 'n02Station',
                                    'type': 'line',
                                    'source': 'n02Station',
                                    "paint": {
                                        "line-color": "rgba(0, 200, 0, 1)",
                                        "line-width": 10
                                    }
                                });

                                map.on('click', 'n02Station', function (e) {
                                    console.log("click")

                                    var coordinates;
                                    if (e.features[0].geometry.type === 'Polygon') {
                                        coordinates = e.features[0].geometry.coordinates[0][0].slice();
                                    } else if (e.features[0].geometry.type === 'MultiPolygon') {
                                        coordinates = e.features[0].geometry.coordinates[0][0][0].slice();
                                    } else if (e.features[0].geometry.type === 'LineString') {
                                        coordinates = e.features[0].geometry.coordinates[0].slice();
                                    } else if (e.features[0].geometry.type === 'MultiLineString') {
                                        coordinates = e.features[0].geometry.coordinates[0][0].slice();
                                    }
                                    var html = e.features[0].properties.N02_005;

                                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                                    }

                                    // ポップアップを表示する
                                    new maplibregl.Popup()
                                            .setLngLat(coordinates)
                                            .setHTML(html)
                                            .addTo(map);
                                    var infoName = $("#info-name")[0];
                                    infoName.innerHTML = e.features[0].properties.N02_005;

                                    var info = $("#info-comment")[0];
                                    var infoComment = '<table>'
                                            + '<tr><td>鉄道区分</td><td>' + e.features[0].properties.N02_001 + '('
                                            + (e.features[0].properties.N02_001 === '11' ? '普通鉄道JR' :
                                                    (e.features[0].properties.N02_001 === '12' ? '普通鉄道' :
                                                            (e.features[0].properties.N02_001 === '13' ? '鋼索鉄道' :
                                                                    (e.features[0].properties.N02_001 === '14' ? '懸垂式鉄道' :
                                                                            (e.features[0].properties.N02_001 === '15' ? '跨座式鉄道' :
                                                                                    (e.features[0].properties.N02_001 === '16' ? '案内軌条式鉄道' :
                                                                                            (e.features[0].properties.N02_001 === '17' ? '無軌条鉄道' :
                                                                                                    (e.features[0].properties.N02_001 === '21' ? '軌道' :
                                                                                                            (e.features[0].properties.N02_001 === '22' ? '懸垂式モノレール' :
                                                                                                                    (e.features[0].properties.N02_001 === '23' ? '跨座式モノレール' :
                                                                                                                            (e.features[0].properties.N02_001 === '24' ? '案内軌条式' :
                                                                                                                                    (e.features[0].properties.N02_001 === '25' ? '浮上式' : ''))))))))))))
                                            + ')</td></tr>'
                                            + '<tr><td>事業者種別</td><td>' + e.features[0].properties.N02_002 + '('
                                            + (e.features[0].properties.N02_002 === '1' ? 'JRの新幹線' :
                                                    (e.features[0].properties.N02_002 === '2' ? 'JR在来線' :
                                                            (e.features[0].properties.N02_002 === '3' ? '公営鉄道' :
                                                                    (e.features[0].properties.N02_002 === '4' ? '民営鉄道' :
                                                                            (e.features[0].properties.N02_002 === '5' ? '第三セクター' : '')))))
                                            + ')</td></tr>'
                                            + '<tr><td>路線名</td><td>' + e.features[0].properties.N02_003 + '</td></tr>'
                                            + '<tr><td>運営会社</td><td>' + e.features[0].properties.N02_004 + '</td></tr>'
                                            + '<tr><td>駅名</td><td>' + e.features[0].properties.N02_005 + '</td></tr>'
                                            + '</table>';
                                    info.innerHTML = infoComment;
                                });
                            });
                });
    }
    if (n02Loaded) {
        if (value === true) {
            map.setLayoutProperty('n02RailroadSection', 'visibility', 'visible');
            map.setLayoutProperty('n02Station', 'visibility', 'visible');
        } else {
            map.setLayoutProperty('n02RailroadSection', 'visibility', 'none');
            map.setLayoutProperty('n02Station', 'visibility', 'none');
        }
    }
}

// 500mメッシュ別将来推計人口データ（H30国政局推計）を追加
var mesh500h30Loaded = false;
check = document.getElementById('mesh500h30');
check.onchange = function () {
    var value = this.checked;
    if (value === true && mesh500h30Loaded === false) {
        // 500mメッシュ別将来推計人口データ（H30国政局推計）を追加
        $.getJSON(context + '/mesh500h30/500m_mesh_2018_' + (areaCode === null ? '' : areaCode.substring(0, 2)) + '.geojson', {},
                function (json) {
                    mesh500h30Loaded = true;
//                var features = json.features;
//                var filtered = features.filter(function (feature) {
//                    return areaCode === null || areaCode === '' || feature.properties.P28_001.startsWith(areaCode);
//                });
//                json.features = filtered;

                    map.addSource('mesh500h30', {
                        type: 'geojson',
                        data: json
                    });
                    map.addLayer({
                        'id': 'mesh500h30',
                        'type': 'fill',
                        'source': 'mesh500h30',
                        "paint": {
                            "fill-color": "rgba(0, 0, 255, 0.2)"
                        }
                    });

                    map.on('click', 'mesh500h30', function (e) {
                        var coordinates;
                        if (e.features[0].geometry.type === 'Polygon') {
                            coordinates = e.features[0].geometry.coordinates[0][0].slice();
                        } else if (e.features[0].geometry.type === 'MultiPolygon') {
                            coordinates = e.features[0].geometry.coordinates[0][0][0].slice();
                        } else if (e.features[0].geometry.type === 'LineString') {
                            coordinates = e.features[0].geometry.coordinates[0].slice();
                        } else if (e.features[0].geometry.type === 'MultiLineString') {
                            coordinates = e.features[0].geometry.coordinates[0][0].slice();
                        }
                        var html = e.features[0].properties.MESH_ID;

                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }

                        // ポップアップを表示する
                        new maplibregl.Popup()
                                .setLngLat(coordinates)
                                .setHTML(html)
                                .addTo(map);
                        var infoName = $("#info-name")[0];
                        infoName.innerHTML = e.features[0].properties.MESH_ID;

                        var info = $("#info-comment")[0];
                        var infoComment = '<table>'
                                + '<tr><td>分割地域メッシュコード</td><td>' + e.features[0].properties.MESH_ID + '</td></tr>'
                                + '<tr><td>行政区域コード</td><td>' + e.features[0].properties.SHICODE + '</td></tr>';
                        for (let key in e.features[0].properties) {
                            if (key.startsWith('PTN_')) {
                                infoComment += '<tr><td>' + key + '</td><td>' + e.features[0].properties[key] + '</td></tr>';
                            }
                        }

                        infoComment += '</table>';
                        info.innerHTML = infoComment;
                    });
                });
        if (areaCode.substring(0, 2) === '01') {
            $.getJSON(context + '/mesh500h30/500m_mesh_2018_' + (areaCode === null ? '' : areaCode.substring(0, 2)) + '-2.geojson', {},
                    function (json) {
                        mesh500h30Loaded = true;
//                var features = json.features;
//                var filtered = features.filter(function (feature) {
//                    return areaCode === null || areaCode === '' || feature.properties.P28_001.startsWith(areaCode);
//                });
//                json.features = filtered;

                        map.addSource('mesh500h30-2', {
                            type: 'geojson',
                            data: json
                        });
                        map.addLayer({
                            'id': 'mesh500h30-2',
                            'type': 'fill',
                            'source': 'mesh500h30-2',
                            "paint": {
                                "fill-color": "rgba(0, 0, 255, 0.2)"
                            }
                        });

                        map.on('click', 'mesh500h30-2', function (e) {
                            var coordinates;
                            if (e.features[0].geometry.type === 'Polygon') {
                                coordinates = e.features[0].geometry.coordinates[0][0].slice();
                            } else if (e.features[0].geometry.type === 'MultiPolygon') {
                                coordinates = e.features[0].geometry.coordinates[0][0][0].slice();
                            } else if (e.features[0].geometry.type === 'LineString') {
                                coordinates = e.features[0].geometry.coordinates[0].slice();
                            } else if (e.features[0].geometry.type === 'MultiLineString') {
                                coordinates = e.features[0].geometry.coordinates[0][0].slice();
                            }
                            var html = e.features[0].properties.MESH_ID;

                            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                            }

                            // ポップアップを表示する
                            new maplibregl.Popup()
                                    .setLngLat(coordinates)
                                    .setHTML(html)
                                    .addTo(map);
                            var infoName = $("#info-name")[0];
                            infoName.innerHTML = e.features[0].properties.MESH_ID;

                            var info = $("#info-comment")[0];
                            var infoComment = '<table>'
                                    + '<tr><td>分割地域メッシュコード</td><td>' + e.features[0].properties.MESH_ID + '</td></tr>'
                                    + '<tr><td>行政区域コード</td><td>' + e.features[0].properties.SHICODE + '</td></tr>';
                            for (let key in e.features[0].properties) {
                                if (key.startsWith('PTN_')) {
                                    infoComment += '<tr><td>' + key + '</td><td>' + e.features[0].properties[key] + '</td></tr>';
                                }
                            }

                            infoComment += '</table>';
                            info.innerHTML = infoComment;
                        });
                    });
        }
    }
    if (mesh500h30Loaded) {
        if (value === true) {
            map.setLayoutProperty('mesh500h30', 'visibility', 'visible');
            if (areaCode.substring(0, 2) === '01') {
                map.setLayoutProperty('mesh500h30-2', 'visibility', 'visible');
            }
        } else {
            map.setLayoutProperty('mesh500h30', 'visibility', 'none');
            if (areaCode.substring(0, 2) === '01') {
                map.setLayoutProperty('mesh500h30-2', 'visibility', 'none');
            }
        }
    }
}

var select = document.getElementById('prefecture');
select.onchange = function () {
    var areaCode = this.value;
    var positionUrl;
    switch (areaCode) {
        case "":
            return;
        case "01":
            positionUrl = "&lat=43.063940637499996&lon=141.347906782";
            break;
        case "02":
            positionUrl = "&lat=40.824338&lon=140.740087";
            break;
        case "03":
            positionUrl = "&lat=39.703647&lon=141.152592";
            break;
        case "04":
            positionUrl = "&lat=38.268803&lon=140.871846";
            break;
        case "05":
            positionUrl = "&lat=39.718058&lon=140.10325";
            break;
        case "06":
            positionUrl = "&lat=38.240457&lon=140.363278";
            break;
        case "07":
            positionUrl = "&lat=37.749957&lon=140.467734";
            break;
        case "08":
            positionUrl = "&lat=36.34145&lon=140.446735";
            break;
        case "09":
            positionUrl = "&lat=36.565689&lon=139.883528";
            break;
        case "10":
            positionUrl = "&lat=36.391192&lon=139.060947";
            break;
        case "11":
            positionUrl = "&lat=35.856907&lon=139.648854";
            break;
        case "12":
            positionUrl = "&lat=35.604588&lon=140.123184";
            break;
        case "13":
            positionUrl = "&lat=35.689568&lon=139.691717";
            break;
        case "14":
            positionUrl = "&lat=35.44771&lon=139.642536";
            break;
        case "15":
            positionUrl = "&lat=37.902238&lon=139.023531";
            break;
        case "16":
            positionUrl = "&lat=36.69519&lon=137.211341";
            break;
        case "17":
            positionUrl = "&lat=36.594652&lon=136.625725";
            break;
        case "18":
            positionUrl = "&lat=36.065244&lon=136.221791";
            break;
        case "19":
            positionUrl = "&lat=35.663935&lon=138.568379";
            break;
        case "20":
            positionUrl = "&lat=36.65131&lon=138.180991";
            break;
        case "21":
            positionUrl = "&lat=35.391199&lon=136.722168";
            break;
        case "22":
            positionUrl = "&lat=34.976906&lon=138.383023";
            break;
        case "23":
            positionUrl = "&lat=35.180198&lon=136.906739";
            break;
        case "24":
            positionUrl = "&lat=34.730268&lon=136.508594";
            break;
        case "25":
            positionUrl = "&lat=35.004394&lon=135.868292";
            break;
        case "26":
            positionUrl = "&lat=35.021279&lon=135.755635";
            break;
        case "27":
            positionUrl = "&lat=34.686394&lon=135.519994";
            break;
        case "28":
            positionUrl = "&lat=34.691304&lon=135.182995";
            break;
        case "29":
            positionUrl = "&lat=34.685231&lon=135.832883";
            break;
        case "30":
            positionUrl = "&lat=34.225994&lon=135.16745";
            break;
        case "31":
            positionUrl = "&lat=35.503704&lon=134.238174";
            break;
        case "32":
            positionUrl = "&lat=35.472212&lon=133.05053";
            break;
        case "33":
            positionUrl = "&lat=34.661759&lon=133.934894";
            break;
        case "34":
            positionUrl = "&lat=34.396271&lon=132.459369";
            break;
        case "35":
            positionUrl = "&lat=34.185859&lon=131.471401";
            break;
        case "36":
            positionUrl = "&lat=34.065728&lon=134.559484";
            break;
        case "37":
            positionUrl = "&lat=34.34016&lon=134.04339";
            break;
        case "38":
            positionUrl = "&lat=33.841646&lon=132.766103";
            break;
        case "39":
            positionUrl = "&lat=33.559753&lon=133.531115";
            break;
        case "40":
            positionUrl = "&lat=33.606261&lon=130.418114";
            break;
        case "41":
            positionUrl = "&lat=33.249322&lon=130.298799";
            break;
        case "42":
            positionUrl = "&lat=32.744836&lon=129.873514";
            break;
        case "43":
            positionUrl = "&lat=32.790374&lon=130.741134";
            break;
        case "44":
            positionUrl = "&lat=33.238128&lon=131.612605";
            break;
        case "45":
            positionUrl = "&lat=31.910975&lon=131.423863";
            break;
        case "46":
            positionUrl = "&lat=31.560185&lon=130.558141";
            break;
        case "47":
            positionUrl = "&lat=26.212365&lon=127.680975";
            break;
    }
    window.location.href = "index.html?areaCode=" + areaCode + positionUrl;
}

var updateButton = document.getElementById('updateDetails');
var dialog = document.getElementById('dialog');
updateButton.addEventListener('click', function onOpen() {
    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    } else {
        alert("The <dialog> API is not supported by this browser");
    }
});

// Change the cursor to a pointer when the mouse is over the places layer.
map.on('mouseenter', 'shelter_point', function () {
    map.getCanvas().style.cursor = 'pointer';
});

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'shelter_point', function () {
    map.getCanvas().style.cursor = '';
});

// Change the cursor to a pointer when the mouse is over the places layer.
map.on('mouseenter', 'disaster', function () {
    map.getCanvas().style.cursor = 'pointer';
});

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'disaster', function () {
    map.getCanvas().style.cursor = '';
});

// 印刷ボタンが押されたら印刷画面を表示する
$('#print-button').on('click', function () {
    window.print();
});