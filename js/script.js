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

let centroidsData = null;

function loadCentroidsData() {
    const centroidsUrl = 'data/Bairros_Belem_Centroids.json';

    fetch(centroidsUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao carregar o GeoJSON dos centroids: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            centroidsData = data;
            console.log('Dados carregados com sucesso:', centroidsData);
        })
        .catch(error => {
            console.error("Erro ao carregar o GeoJSON dos centroids:", error);
        });
}

function loadWeatherData(lat = -1.4558, lon = -48.4902) {
    document.getElementById('temperatura').innerHTML = `<i class="fas fa-thermometer-half"></i> Carregando temperatura...`;
    document.getElementById('precipitacao').innerHTML = `<i class="fas fa-cloud-showers-heavy"></i> Carregando precipitação...`;
    document.getElementById('sensacao_termica').innerHTML = `<i class="fas fa-temperature-high"></i> Carregando sensação térmica...`;

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation,temperature_2m,wind_speed_10m`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            console.log(data);

            const temperature = data.current_weather ? data.current_weather.temperature : null;
            const precipitation = data.hourly && data.hourly.precipitation ? data.hourly.precipitation[0] : 0;
            const windSpeed = data.current_weather ? data.current_weather.windspeed : null;

            let feelsLike = data.current_weather && data.current_weather.apparent_temperature !== undefined
                              ? data.current_weather.apparent_temperature
                              : null;

            if (feelsLike === null && windSpeed !== null && temperature !== null) {
                feelsLike = 13.12 + 0.6215 * temperature - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temperature * Math.pow(windSpeed, 0.16);
            }

            if (temperature === null) {
                console.error("Erro: Temperatura não encontrada.");
                document.getElementById('temperatura').textContent = "Erro ao carregar a temperatura.";
            } else {
                const temperaturaElement = document.getElementById('temperatura');
                temperaturaElement.innerHTML = `<i class="fas fa-thermometer-half"></i> Temperatura: ${temperature}°C`;
            }

            if (precipitation === null || precipitation === undefined) {
                console.error("Erro: Precipitação não encontrada.");
                document.getElementById('precipitacao').textContent = "Erro ao carregar a precipitação.";
            } else {
                const precipitacaoElement = document.getElementById('precipitacao');
                precipitacaoElement.innerHTML = `<i class="fas fa-cloud-showers-heavy"></i> Precipitação: ${precipitation}mm`;
            }

            if (feelsLike === null || feelsLike === undefined) {
                console.error("Erro: Sensação térmica não encontrada.");
                document.getElementById('sensacao_termica').textContent = "Sensação térmica não disponível.";
            } else {
                const sensacaoTermicaElement = document.getElementById('sensacao_termica');
                sensacaoTermicaElement.innerHTML = `<i class="fas fa-temperature-high"></i> Sensação Térmica: ${feelsLike.toFixed(1)}°C`;
            }

            console.log(`Atualização: Temperatura = ${temperature}°C, Precipitação = ${precipitation}mm, Sensação Térmica = ${feelsLike}°C`);
        })
        .catch(error => {
            console.error("Erro ao carregar os dados meteorológicos:", error);
            document.getElementById('temperatura').textContent = "Erro ao carregar a temperatura.";
            document.getElementById('precipitacao').textContent = "Erro ao carregar a precipitação.";
            document.getElementById('sensacao_termica').textContent = "Erro ao carregar a sensação térmica.";
        });
}

window.onload = () => {
    loadWeatherData();
    loadCentroidsData();
    setInterval(loadWeatherData, 30000);
};


let arborizacaoLayers = [];

function loadTreeIcons() {
    const treeFiles = [
        'data/fatimaArv.geojson',
        'data/marcoArv.geojson',
        'data/redutoArv.geojson',
        'data/nazareArv.geojson'
    ];

    Promise.all(treeFiles.map(file => fetch(file).then(response => {
        if (!response.ok) throw new Error(`Erro ao carregar o arquivo GeoJSON: ${file}`);
        return response.json();
    })))
    .then(datasets => {
        arborizacaoLayers.forEach(layer => map.removeLayer(layer));
        arborizacaoLayers = []; 

        datasets.forEach(data => {
            const layer = L.geoJson(data, {
                pointToLayer: function (feature, latlng) {
                    if (map.getZoom() >= 13) {
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
            });
            arborizacaoLayers.push(layer);

            if (document.getElementById('toggle-arborizacao').checked) {
                layer.addTo(map);
            }
        });
    })
    .catch(error => console.error('Erro ao carregar os arquivos GeoJSON:', error));
}

function toggleArborizacaoLayer() {
    const switchButton = document.getElementById('toggle-arborizacao');
    if (switchButton.checked) {
        loadTreeIcons();
    } else {
        arborizacaoLayers.forEach(layer => map.removeLayer(layer));
    }
}

map.on('zoomend', function() {
    if (document.getElementById('toggle-arborizacao').checked) {
        arborizacaoLayers.forEach(layer => map.removeLayer(layer));
        loadTreeIcons();
    }
});

document.getElementById('toggle-arborizacao').addEventListener('change', toggleArborizacaoLayer);

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

    const bairroNome = selectedLayer.feature.properties.BAIRRO;
    const centroide = getCentroideByBairroNome(bairroNome);

    if (centroide) {
        loadWeatherData(centroide.lat, centroide.lon);
    } else {
        console.log(`Centroide não encontrado para o bairro ${bairroNome}`);
    }
}


function getCentroideByBairroNome(bairroNome) {
    if (!centroidsData) return null;

    const normalizedBairroNome = bairroNome.trim().toLowerCase();

    const bairroCentroide = centroidsData.find(centroid => {
        const bairroCentroidNome = centroid.bairro.trim().toLowerCase();
        return bairroCentroidNome === normalizedBairroNome;
    });

    if (bairroCentroide) {
        return {
            lat: bairroCentroide.latitude,
            lon: bairroCentroide.longitude
        };
    }

    return null;
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

let vegetacaoLayer = null;

function loadVegetacaoLayer() {
    fetch('data/ndvi_belem_wgs84.geojson')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar o arquivo GeoJSON de vegetação');
            return response.json();
        })
        .then(data => {
            if (vegetacaoLayer) {
                map.removeLayer(vegetacaoLayer);
            }

            function getColor(classesValue) {
                if (classesValue === 3) {
                    return "rgb(0, 100, 0)";
                } else if (classesValue === 2) {
                    return "rgb(102, 205, 102)"; 
                } else if (classesValue === 1) {
                    return "rgb(204, 255, 204)"; 
                } else {
                    return "rgb(255, 255, 255)"; 
                }
            }

            vegetacaoLayer = L.geoJson(data, {
                style: function (feature) {
                    const classesValue = feature.properties.Classes; 
                    console.log("Classe da vegetação:", classesValue);
                    return {
                        color: "#000000",
                        weight: 0.5,
                        opacity: 0.4,
                        fillOpacity: 0.7,
                        fillColor: getColor(classesValue) 
                    };
                }
            });

            vegetacaoLayer.addTo(map);
        })
        .catch(error => console.error("Erro ao carregar o arquivo GeoJSON de vegetação:", error));
}

function toggleVegetacaoLayer() {
    const switchButton = document.getElementById('toggle-vegetacao');
    console.log("Toggle ativado:", switchButton.checked);
    if (switchButton.checked) {
        loadVegetacaoLayer();
    } else if (vegetacaoLayer) {
        map.removeLayer(vegetacaoLayer);
    }
}

document.getElementById('toggle-vegetacao').addEventListener('change', toggleVegetacaoLayer);


function switchGeoJsonLayer(layerName) {
    const layerUrls = {
        bairros: 'data/Bairros_Belem.geojson',
        municipios: 'data/municipios.geojson'
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

    if (selectedTransportIcon) {
        selectedTransportIcon.classList.remove('selected');
        selectedTransportIcon = null; 
    }

    const yearButtons = document.querySelectorAll('#year-selection button');
    yearButtons.forEach(button => {
        button.classList.remove('selected');
    });

    const transportDataContainer = document.getElementById("info-content");
    transportDataContainer.innerHTML = '';

    const dashboardFrame = document.getElementById("dashboard-frame");
    dashboardFrame.src = '';

    setTimeout(() => {
        infoPanel.classList.remove("show");
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
