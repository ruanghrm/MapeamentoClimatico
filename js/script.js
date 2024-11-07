const map = L.map('map').setView([-1.4558, -48.4902], 12);
let selectedLayer = null;
let selectedYearButton = null;
let selectedTransportIcon = null;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const treeIcon = L.icon({
    iconUrl: 'data/tree.png',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

function loadTreeIcons() {
    const treeFiles = [
        'data/output_data.geojson',
        'data/dados_inventario_marco.geojson'
    ];

    Promise.all(treeFiles.map(file => fetch(file).then(response => {
        if (!response.ok) throw new Error(`Erro ao carregar o arquivo GeoJSON: ${file}`);
        return response.json();
    })))
    .then(datasets => {
        datasets.forEach(data => {
            L.geoJson(data, {
                pointToLayer: function (feature, latlng) {
                    if (map.getZoom() >= 15) {
                        const marker = L.marker(latlng, { icon: treeIcon });

                        marker.on('mouseover', function() {
                            this.setIcon(L.icon({
                                iconUrl: 'data/tree_highlighted.png',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            }));
                        });

                        marker.on('mouseout', function() {
                            this.setIcon(treeIcon);
                        });

                        return marker;
                    }
                    return null;
                }
            }).addTo(map);
        });
    })
    .catch(error => console.error('Erro ao carregar os arquivos GeoJSON:', error));
}

loadTreeIcons();

map.on('zoomend', function() {
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    loadTreeIcons();
});

function style(feature) {
    return {
        color: "#2262CC",
        weight: 1.2,
        opacity: 1,
        fillOpacity: 0.25
    };
}

function selectYear(year) {
    if (selectedYearButton) {
        selectedYearButton.classList.remove('selected');
    }

    selectedYearButton = document.querySelector(`button[onclick="selectYear(${year})"]`);
    selectedYearButton.classList.add('selected');

    const infoContent = document.getElementById("info-content");
    const bairroId = selectedLayer ? selectedLayer.feature.properties.ID : null;
    updateDashboard(infoContent, bairroId);
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 2,
        color: "#666",
        fillOpacity: 0.35
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
        weight: 2,
        color: "#FF6600",
        fillOpacity: 0.4
    });

    openInfoPanel(e.target.feature.properties);
}

let geoJsonLayer;
function loadGeoJsonLayer(url) {
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar o arquivo GeoJSON');
            return response.json();
        })
        .then(data => {
            if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
            }
            geoJsonLayer = L.geoJson(data, {
                style: style,
                onEachFeature: (feature, layer) => {
                    layer.on({
                        mouseover: highlightFeature,
                        mouseout: resetHighlight,
                        click: onFeatureClick
                    });
                }
            }).addTo(map);
        })
        .catch(error => console.error("Erro:", error));
}

function switchGeoJsonLayer(layerName) {
    const layerUrls = {
        bairros: 'data/Bairros_Belem.geojson',
        municipios: 'data/BELEM_GEOJSON_.geojson'
    };

    const url = layerUrls[layerName];
    if (url) {
        loadGeoJsonLayer(url);
    } else {
        console.warn('Camada GeoJSON não encontrada:', layerName);
    }
}

switchGeoJsonLayer('bairros');

function toggleLayer() {
    const switchButton = document.getElementById('toggle-layer');
    const currentLayer = switchButton.checked ? 'municipios' : 'bairros';
    switchGeoJsonLayer(currentLayer);
}

document.getElementById('toggle-layer').addEventListener('change', toggleLayer);

function openInfoPanel(properties) {
    const infoPanel = document.getElementById("info-panel");
    const bairroId = properties.ID;

    updateDashboard(document.getElementById("info-content"), bairroId);
    fetchBuildingData("eficiencia_energetica");
    fetchBuildingData("grafico_emissoes");
    fetchBuildingData("distribuicao_impacto");

    infoPanel.classList.add("show");
    infoPanel.classList.remove("hide");
}

function fetchBuildingData(tipoAnalise) {
    const buildingDataUrl = `http://127.0.0.1:8000/gerar_grafico/${tipoAnalise}`;

    fetch(buildingDataUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na requisição! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const containerId = tipoAnalise === "eficiencia_energetica" ? 'building-chart' :
                tipoAnalise === "grafico_emissoes" ? 'emissions-chart' :
                'impact-chart';

            document.getElementById(containerId).innerHTML = data;
            const scripts = document.getElementById(containerId).getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                eval(scripts[i].innerText);
            }
        })
        .catch(error => console.error("Erro ao carregar dados dos edifícios:", error));
}

function closeInfoPopup() {
    const infoPanel = document.getElementById("info-panel");
    infoPanel.classList.add("hide");
    setTimeout(() => {
        infoPanel.classList.remove("show");
        location.reload();
    }, 400);

    if (selectedLayer) {
        geoJsonLayer.resetStyle(selectedLayer);
        selectedLayer = null;
    }
}

function updateDashboard(infoContent, bairroId) {
    const selectedYear = selectedYearButton ? selectedYearButton.textContent : null;
    const selectedTransport = selectedTransportIcon ? selectedTransportIcon.title.toUpperCase() : null;

    if (selectedYear && selectedTransport && bairroId !== null) {
        const dashboardUrl = `http://localhost:8000/dashboard/${encodeURIComponent(selectedTransport)}/${encodeURIComponent(selectedYear)}`;

        const dashboardFrame = document.getElementById("dashboard-frame");

        if (dashboardFrame.src !== dashboardUrl) {
            dashboardFrame.src = dashboardUrl;
        }

        fetch(dashboardUrl)
            .then(response => {
                return response.text();
            })
            .then(data => {
                const transportDataContainer = document.getElementById("info-content");

                const transportData = `<p>Dados de Transporte: ${JSON.stringify(data, null, 2)}</p>`;
                transportDataContainer.innerHTML = transportDataContainer.innerHTML.replace(/Dados de Transporte:.*/, transportData);
            })
            .catch(error => console.error("Erro ao carregar o dashboard:", error));
    } else {
        console.warn('Ano ou transporte não selecionados, ou ID do bairro é nulo.');
    }
}

document.querySelectorAll('#year-selection button').forEach(button => {
    button.addEventListener('click', function () {
        selectYear(parseInt(this.textContent));
    });
});

document.querySelectorAll('#transport-icons i').forEach(icon => {
    icon.addEventListener('click', function () {
        if (selectedTransportIcon) {
            selectedTransportIcon.classList.remove('selected');
        }
        selectedTransportIcon = this;
        this.classList.add('selected');

        const infoContent = document.getElementById("info-content");
        const bairroId = selectedLayer ? selectedLayer.feature.properties.ID : null;
        updateDashboard(infoContent, bairroId);
    });
});
