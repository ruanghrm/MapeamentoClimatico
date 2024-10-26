const map = L.map('map').setView([-1.4558, -48.4902], 12);
let selectedLayer = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function style(feature) {
    return {
        color: "#2262CC",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.3
    };
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: "#666",
        fillOpacity: 0.5
    });
}

function resetHighlight(e) {
    if (e.target !== selectedLayer) {
        geoJsonLayer.resetStyle(e.target);
    }
}

function onFeatureClick(e) {
    if (selectedLayer) {
        geoJsonLayer.resetStyle(selectedLayer);
    }
    
    selectedLayer = e.target;
    selectedLayer.setStyle({
        weight: 3,
        color: "#FF6600",
        fillOpacity: 0.6
    });

    openInfoPanel(e.target.feature.properties);
}

let geoJsonLayer;
fetch("data/Bairros_Belem.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao carregar o arquivo GEOJSON');
        }
        return response.json();
    })
    .then(data => {
        geoJsonLayer = L.geoJson(data, {
            style: style,
            onEachFeature: function (feature, layer) {
                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight,
                    click: onFeatureClick
                });
            }
        }).addTo(map);
    })
    .catch(error => console.error("Erro:", error));

function openInfoPanel(properties) {
    const infoPanel = document.getElementById("info-panel");
    const infoContent = document.getElementById("info-content");

    infoPanel.classList.add("show");
    infoPanel.classList.remove("hide");
}

function closeInfoPopup() {
    const infoPanel = document.getElementById("info-panel");
    infoPanel.classList.add("hide");
    setTimeout(() => {
        infoPanel.classList.remove("show");
    }, 400);
    if (selectedLayer) {
        geoJsonLayer.resetStyle(selectedLayer);
        selectedLayer = null;
    }
}
