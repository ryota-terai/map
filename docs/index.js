// ベースマップを作成する
// ここでは3DのOpenStreetMapを表示する
var map = new maplibregl.Map({
    container: 'map',
    style: 'style.json',
    center: [129.768337, 32.986804],
    zoom: 19,
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

// 画面がロードされたら地図にレイヤを追加する
map.on('load', function () {
    $.getJSON("./data/shelter.json", {},
            function (json) {
//                var features = json.features;
//                var filtered = features.filter(function (feature) {
//                    return feature.properties.A48_003.startsWith(areaCode);
//                });
//                json.features = filtered;

                // 避難所情報レイヤを追加
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
            });

    $.getJSON("./data/a48.json", {},
            function (json) {
//                var features = json.features;
//                var filtered = features.filter(function (feature) {
//                    return feature.properties.A48_003.startsWith(areaCode);
//                });
//                json.features = filtered;

                // 災害危険区域レイヤを追加
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
                        "fill-color": "rgba(255, 0, 0, 1)",
                        "fill-opacity": 0.3
                    }
                });
            });
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
    var shelterName = $("#shelter-name")[0];
    shelterName.innerHTML = e.features[0].properties.P20_002;

    var shelterInfo = $("#shelter-info-comment")[0];
    var shelterInfoComment = '<table><tr><td>' + '施設の種類</td><td>' + e.features[0].properties.P20_004 + '</td></tr>'
            + '<tr><td>地震災害</td><td>' + (e.features[0].properties.P20_007 === 1 ? '〇' : '×') + '</td></tr>'
            + '<tr><td>津波災害</td><td>' + (e.features[0].properties.P20_008 === 1 ? '〇' : '×') + '</td></tr>'
            + '<tr><td>水害</td><td>' + (e.features[0].properties.P20_009 === 1 ? '〇' : '×') + '</td></tr>'
            + '<tr><td>火山災害</td><td>' + (e.features[0].properties.P20_010 === 1 ? '〇' : '×') + '</td></tr>'
            + '<tr><td>その他</td><td>' + (e.features[0].properties.P20_011 === 1 ? '〇' : '×') + '</td></tr>'
            + '<tr><td>指定なし</td><td>' + (e.features[0].properties.P20_012 === 1 ? '〇' : '×') + '</td></tr>'
            + '</table>';
    shelterInfo.innerHTML = shelterInfoComment;

});

// 災害危険区域レイヤを追加
map.on('click', 'a48', function (e) {
    console.log("click")

    var coordinates;
    if (e.features[0].geometry.type === 'Polygon') {
        coordinates = e.features[0].geometry.coordinates[0][0].slice();
    } else if (e.features[0].geometry.type === 'MultiPolygon') {
        coordinates = e.features[0].geometry.coordinates[0][0][0].slice();
    }
    var html = '<h2>' + e.features[0].properties.A48_005 + '</h2>';
    html += '<hr>'
            + '<table>'
            + '<tr><td>' + '都道府県名</td><td>' + e.features[0].properties.A48_001 + '</td></tr>'
            + '<tr><td>' + '市町村名</td><td>' + e.features[0].properties.A48_002 + '</td></tr>'
            + '<tr><td>' + '代表行政コード</td><td>' + e.features[0].properties.A48_003 + '</td></tr>'
            + '<tr><td>' + '指定主体区分</td><td>' + e.features[0].properties.A48_004 + '('
            + (e.features[0].properties.A48_004 === 1 ? '都道府県' :
                    (e.features[0].properties.A48_004 === 2 ? '市町村' : '')
                    )
            + ')</td></tr>'
            + '<tr><td>' + '区域名</td><td>' + e.features[0].properties.A48_005 + '</td></tr>'
            + '<tr><td>' + '所在地</td><td>' + e.features[0].properties.A48_006 + '</td></tr>'
            + '<tr><td>' + '指定理由コード</td><td>' + e.features[0].properties.A48_007 + '('
            + (e.features[0].properties.A48_007 === 1 ? '水害(河川)' :
                    (e.features[0].properties.A48_007 === 2 ? '水害(海)' :
                            (e.features[0].properties.A48_007 === 3 ? '水害(河川・海)' :
                                    (e.features[0].properties.A48_007 === 4 ? '急傾斜地崩壊等' :
                                            (e.features[0].properties.A48_007 === 5 ? '地すべり等' :
                                                    (e.features[0].properties.A48_007 === 6 ? '火山被害' :
                                                            (e.features[0].properties.A48_007 === 7 ? 'その他' : '')
                                                            )
                                                    )
                                            )
                                    )
                            )
                    )
            + ')</td></tr>'
            + '<tr><td>' + '指定理由詳細</td><td>' + e.features[0].properties.A48_008 + '</td></tr>'
            + '<tr><td>' + '告示年月日</td><td>' + e.features[0].properties.A48_009 + '</td></tr>'
            + '<tr><td>' + '告示番号</td><td>' + e.features[0].properties.A48_010 + '</td></tr>'
            + '<tr><td>' + '根拠条例</td><td>' + e.features[0].properties.A48_011 + '</td></tr>'
            + '<tr><td>' + '面積</td><td>' + e.features[0].properties.A48_012 + 'ha</td></tr>'
            + '<tr><td>' + '縮尺</td><td>' + e.features[0].properties.A48_013 + '</td></tr>'
            + '<tr><td>' + 'その他</td><td>' + e.features[0].properties.A48_014 + '</td></tr>'
            + '</table>';

    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    // ポップアップを表示する
    new maplibregl.Popup()
            .setLngLat(coordinates)
            .setHTML(html)
            .addTo(map);
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