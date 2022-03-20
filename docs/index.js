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
//                var shelterJson = json;
//                var features = shelterJson.features;
//                var filteredShelter = features.filter(function (feature) {
//                    return feature.properties.open === false && feature.properties.P20_001.startsWith(areaCode);
//                });
//
//                var closedShelter = shelterJson;
//                closedShelter.features = filteredShelter;

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