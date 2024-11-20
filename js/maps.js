let map;
let bairrosLayer;
let municipiosLayer;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -1.3650, lng: -48.4500 },
        zoom: 12,
    });

    switchGeoJsonLayer('bairros');
}

function loadGeoJsonLayer(url) {
    const layer = new google.maps.Data();

    layer.loadGeoJson(url);

    layer.setStyle(function(feature) {
        return {
            fillColor: '#0000FF',  
            fillOpacity: 0.1,
            strokeColor: '#0000FF',
            strokeOpacity: 0.7,
            strokeWeight: 1 
        };
    });

    layer.setMap(map);

    layer.addListener('mouseover', function(event) {
        const feature = event.feature;
        highlightFeature(feature, layer);
    });

    layer.addListener('mouseout', function(event) {
        const feature = event.feature;
        resetHighlight(feature, layer);
    });

    layer.addListener('click', function(event) {
        onFeatureClick(event);
    });

    return layer;
}

function highlightFeature(feature, layer) {
    layer.overrideStyle(feature, {
        strokeWeight: 2, 
        strokeColor: '#FF5733',
        fillColor: '#FF5733',
        fillOpacity: 0.1
    });
}

function resetHighlight(feature, layer) {
    layer.overrideStyle(feature, {
        strokeWeight: 1, 
        strokeColor: '#0000FF',
        fillColor: '#0000FF', 
        fillOpacity: 0.1 
    });
}

function switchGeoJsonLayer(layerName) {
    const layerUrls = {
        bairros: 'data/Bairros_Belem.geojson',
        municipios: 'data/municipios.geojson'
    };

    const url = layerUrls[layerName];

    if (url) {
        if (bairrosLayer) bairrosLayer.setMap(null);
        if (municipiosLayer) municipiosLayer.setMap(null);

        if (layerName === 'bairros') {
            bairrosLayer = loadGeoJsonLayer(url);
            bairrosLayer.addListener('click', onFeatureClick);  
        } else if (layerName === 'municipios') {
            municipiosLayer = loadGeoJsonLayer(url);
            municipiosLayer.addListener('click', onFeatureClick);
        }
    } else {
        console.warn('Camada GeoJSON não encontrada:', layerName);
    }
}


function toggleLayer() {
    const switchButton = document.getElementById('toggle-layer');
    const currentLayer = switchButton.checked ? 'municipios' : 'bairros';
    switchGeoJsonLayer(currentLayer);
}

document.getElementById('toggle-layer').addEventListener('change', toggleLayer);

window.onload = initMap;

let vegetacaoLayer = null;

function loadVegetacaoLayer() {
    fetch('data/ndvi_belem_wgs84.geojson')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar o arquivo GeoJSON de vegetação');
            return response.json();
        })
        .then(data => {
            if (vegetacaoLayer) {
                vegetacaoLayer.setMap(null);
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

            vegetacaoLayer = new google.maps.Data();
            vegetacaoLayer.addGeoJson(data);

            vegetacaoLayer.setStyle(function(feature) {
                const classesValue = feature.getProperty('Classes');
                console.log("Classe da vegetação:", classesValue);
                return {
                    fillColor: getColor(classesValue),
                    fillOpacity: 0.7,
                    strokeColor: '#000000',
                    strokeOpacity: 0.4,
                    strokeWeight: 0.5
                };
            });

            vegetacaoLayer.setMap(map);
        })
        .catch(error => console.error("Erro ao carregar o arquivo GeoJSON de vegetação:", error));
}

function toggleVegetacaoLayer() {
    const switchButton = document.getElementById('toggle-vegetacao');
    console.log("Toggle ativado:", switchButton.checked);
    if (switchButton.checked) {
        loadVegetacaoLayer();
    } else if (vegetacaoLayer) {
        vegetacaoLayer.setMap(null);
    }
}

document.getElementById('toggle-vegetacao').addEventListener('change', toggleVegetacaoLayer);

let arborizacaoMarkers = [];
let arborizacaoLayers = [];
let markerClusterer;  
const zoomThreshold = 16;

function loadTreeIcons(map) {
    const treeFiles = [
        'data/fatimaArv.geojson',
        'data/marcoArv.geojson',
        'data/redutoArv.geojson',
        'data/nazareArv.geojson'
    ];

    arborizacaoLayers.forEach(layer => layer.setMap(null));
    arborizacaoMarkers.forEach(marker => marker.setMap(null));
    arborizacaoMarkers = [];
    arborizacaoLayers = [];

    if (markerClusterer) {
        markerClusterer.clearMarkers();
    }

    Promise.all(treeFiles.map(file => fetch(file).then(response => {
        if (!response.ok) throw new Error(`Erro ao carregar o arquivo GeoJSON: ${file}`);
        return response.json();
    })))
    .then(datasets => {
        datasets.forEach(data => {
            const layer = new google.maps.Data();
            layer.addGeoJson(data);

            layer.forEach(feature => {
                const latLng = feature.getGeometry().get();
                const iconSize = new google.maps.Size(20, 20);

                let marker;

                if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                    const imageElement = document.createElement('img');
                    imageElement.src = 'data/tree.png';
                    imageElement.width = 20;
                    imageElement.height = 20;

                    marker = new google.maps.marker.AdvancedMarkerElement({
                        position: latLng,
                        map: map,
                        title: 'Árvore',
                        content: imageElement 
                    });
                } else {
                    marker = new google.maps.Marker({
                        position: latLng,
                        title: 'Árvore',
                        icon: {
                            url: 'data/tree.png',
                            scaledSize: iconSize 
                        },
                        map: map 
                    });
                }

                marker.addListener('mouseover', function() {
                    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                        marker.content.src = 'data/tree_highlighted.png'; 
                    } else if (marker.setIcon) {
                        marker.setIcon({
                            url: 'data/tree_highlighted.png',
                            scaledSize: iconSize 
                        });
                    }
                });
                marker.addListener('mouseout', function() {
                    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                        marker.content.src = 'data/tree.png'; 
                    } else if (marker.setIcon) {
                        marker.setIcon({
                            url: 'data/tree.png',
                            scaledSize: iconSize 
                        });
                    }
                });

                arborizacaoMarkers.push(marker);
            });

            arborizacaoLayers.push(layer);
        });

        function adjustVisibility() {
            const zoomLevel = map.getZoom();

            if (zoomLevel < zoomThreshold) {
                arborizacaoMarkers.forEach(marker => marker.setMap(null));
                if (markerClusterer) {
                    markerClusterer.clearMarkers();
                }

                markerClusterer = new MarkerClusterer(map, arborizacaoMarkers, {
                    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
                    styles: [{
                        url: 'data/tree-solid2.png',
                        width: 75, 
                        height: 100, 
                        textColor: 'black',
                        textSize: 12,
                        anchorText: [0, 0],
                        textAlignment: 'center'
                    }]
                });
            } else {
                if (markerClusterer) {
                    markerClusterer.clearMarkers();
                }

                arborizacaoMarkers.forEach(marker => marker.setMap(map));
            }
        }

        adjustVisibility();

        google.maps.event.addListener(map, 'zoom_changed', function() {
            adjustVisibility();
        });

        if (document.getElementById('toggle-arborizacao').checked) {
            arborizacaoMarkers.forEach(marker => marker.setMap(map));
        }
    })
    .catch(error => console.error('Erro ao carregar os arquivos GeoJSON:', error));
}

function toggleArborizacaoLayer(map) {
    const switchButton = document.getElementById('toggle-arborizacao');
    if (switchButton.checked) {
        loadTreeIcons(map);
    } else {
        arborizacaoMarkers.forEach(marker => marker.setMap(null));
        arborizacaoLayers.forEach(layer => layer.setMap(null));
        arborizacaoMarkers = [];
        if (markerClusterer) {
            markerClusterer.clearMarkers();
        }
    }
}

document.getElementById('toggle-arborizacao').addEventListener('change', function () {
    toggleArborizacaoLayer(map);
});


let infoWindow;
let riscoLayer;

function loadRiscoLayer() {
    fetch('data/PA_BELEM_SR_CPRM.geojson')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar o arquivo GeoJSON de risco');
            return response.json();
        })
        .then(data => {
            if (riscoLayer) {
                riscoLayer.setMap(null);
            }

            function getColor(grauRisco) {
                if (grauRisco === 'Muito Alto') {
                    return "rgb(255, 0, 0)";
                } else if (grauRisco === 'Alto') {
                    return "rgb(255, 165, 0)";
                } else {
                    return "rgb(255, 255, 255)";
                }
            }

            riscoLayer = new google.maps.Data();
            riscoLayer.addGeoJson(data);

            riscoLayer.setStyle(function (feature) {
                const grauRisco = feature.getProperty('GRAU_RISCO'); 
                return {
                    strokeColor: "#000000",
                    strokeWeight: 0.5,
                    fillOpacity: 0.7,
                    fillColor: getColor(grauRisco)
                };
            });

            riscoLayer.addListener('mouseover', function (event) {
                const feature = event.feature;
                const LOCAL = feature.getProperty('LOCAL');
                const SITUACAO = feature.getProperty('SITUACAO');
                const DESCRICAO = feature.getProperty('DESCRICAO');

                const popupContent = `
                    <div class="custom-info-window">
                        <div class="info-row"><strong>Local:</strong> ${LOCAL || 'Desconhecido'}</div>
                        <div class="info-row"><strong>Situação:</strong> ${SITUACAO || 'Desconhecido'}</div>
                        <div class="info-row"><strong>Descrição:</strong> ${DESCRICAO || 'Desconhecido'}</div>
                    </div>
                `;

                if (!infoWindow) {
                    infoWindow = new google.maps.InfoWindow();
                }

                infoWindow.setContent(popupContent);
                infoWindow.setPosition(event.latLng);

                infoWindow.open(map);
            });

            riscoLayer.addListener('mouseout', function () {
                if (infoWindow) {
                    infoWindow.close();
                }
            });

            riscoLayer.setMap(map);
        })
        .catch(error => console.error("Erro ao carregar o arquivo GeoJSON de risco:", error));
}

function toggleRiscoLayer() {
    const switchButton = document.getElementById('toggle-risco');
    console.log("Toggle ativado:", switchButton.checked);
    if (switchButton.checked) {
        loadRiscoLayer();
    } else if (riscoLayer) {
        riscoLayer.setMap(null);
    }
}

document.getElementById('toggle-risco').addEventListener('change', toggleRiscoLayer);

document.getElementById('toggle-vegetacao').addEventListener('change', function () {
    const legend = document.getElementById('legend-popup');
    if (this.checked) {
        legend.style.display = 'block';
    } else {
        legend.style.display = 'none';
    }
});

document.getElementById('toggle-risco').addEventListener('change', function () {
    const legend2 = document.getElementById('legend-popup2');
    if (this.checked) {
        legend2.style.display = 'block';
    } else {
        legend2.style.display = 'none';
    }
});

let lastLat = -1.4558;
let lastLon = -48.4902;
let selectedFeature = null;

function loadWeatherData(lat = lastLat, lon = lastLon) {
    const temperaturaElement = document.getElementById('temperatura');
    const precipitacaoElement = document.getElementById('precipitacao');
    const sensacaoTermicaElement = document.getElementById('sensacao_termica');
    
    if (temperaturaElement && precipitacaoElement && sensacaoTermicaElement) {
        temperaturaElement.innerHTML = `<i class="fas fa-thermometer-half"></i> Carregando temperatura...`;
        precipitacaoElement.innerHTML = `<i class="fas fa-cloud-showers-heavy"></i> Carregando precipitação...`;
        sensacaoTermicaElement.innerHTML = `<i class="fas fa-temperature-high"></i> Carregando sensação térmica...`;

        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation,temperature_2m,wind_speed_10m`;

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                const temperature = data.current_weather ? data.current_weather.temperature : null;
                const precipitation = data.hourly && data.hourly.precipitation ? data.hourly.precipitation[0] : 0;
                const windSpeed = data.current_weather ? data.current_weather.windspeed : null;

                let feelsLike = data.current_weather && data.current_weather.apparent_temperature !== undefined
                                ? data.current_weather.apparent_temperature
                                : null;

                if (feelsLike === null && windSpeed !== null && temperature !== null) {
                    feelsLike = 13.12 + 0.6215 * temperature - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temperature * Math.pow(windSpeed, 0.16);
                }

                if (temperature !== null) {
                    temperaturaElement.innerHTML = `<i class="fas fa-thermometer-half"></i> Temperatura: ${temperature}°C`;
                } else {
                    console.error("Erro: Temperatura não encontrada.");
                    temperaturaElement.textContent = "Erro ao carregar a temperatura.";
                }

                if (precipitation !== null && precipitation !== undefined) {
                    precipitacaoElement.innerHTML = `<i class="fas fa-cloud-showers-heavy"></i> Precipitação: ${precipitation}mm`;
                } else {
                    console.error("Erro: Precipitação não encontrada.");
                    precipitacaoElement.textContent = "Erro ao carregar a precipitação.";
                }

                if (feelsLike !== null && feelsLike !== undefined) {
                    sensacaoTermicaElement.innerHTML = `<i class="fas fa-temperature-high"></i> Sensação Térmica: ${feelsLike.toFixed(1)}°C`;
                } else {
                    console.error("Erro: Sensação térmica não encontrada.");
                    sensacaoTermicaElement.textContent = "Sensação térmica não disponível.";
                }
            })
            .catch(error => {
                console.error("Erro ao carregar os dados meteorológicos:", error);
                temperaturaElement.textContent = "Erro ao carregar a temperatura.";
                precipitacaoElement.textContent = "Erro ao carregar a precipitação.";
                sensacaoTermicaElement.textContent = "Erro ao carregar a sensação térmica.";
            });
    } else {
        console.error("Erro: Elementos do DOM não encontrados.");
    }
}

function updateLocation(lat, lon) {
    lastLat = lat;
    lastLon = lon;
    loadWeatherData(lat, lon);
}

document.addEventListener('DOMContentLoaded', () => {
    loadWeatherData(lastLat, lastLon);
    setInterval(() => {
        loadWeatherData(lastLat, lastLon);
    }, 30000);
});

function onFeatureClick(event) {
    const lat = event.latLng.lat();
    const lon = event.latLng.lng();

    loadWeatherData(lat, lon);

    if (window.selectedFeature && typeof window.selectedFeature.setOptions === "function") {
        window.selectedFeature.setOptions({
            strokeColor: "#FF6600", 
            strokeWeight: 2, 
            fillOpacity: 0.35   
        });
    }

    window.selectedFeature = event.feature;

    if (window.selectedFeature && typeof window.selectedFeature.setOptions === "function") {
        window.selectedFeature.setOptions({
            strokeColor: "#FF6600", 
            strokeWeight: 3,  
            fillOpacity: 0.4 
        });
    }
}

let queimadasMarkers = [];
let queimadasLayer = [];
let markerClustererQueimadas; 
const zoomThresholdQueimadas = 16;

function loadQueimadasLayer(map) {
    fetch('data/queimadas.geojson')
        .then(response => {
            if (!response.ok) throw new Error('Erro ao carregar o arquivo GeoJSON de queimadas');
            return response.json();
        })
        .then(data => {
            queimadasLayer.forEach(marker => marker.setMap(null));
            queimadasMarkers.forEach(marker => marker.setMap(null));
            queimadasMarkers = [];
            queimadasLayer = [];

            const fireIcon = {
                url: 'data/fire.png',
                scaledSize: new google.maps.Size(21, 21),
                anchor: new google.maps.Point(10, 10)
            };

            data.features.forEach(feature => {
                const latlng = {
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0]
                };

                const marker = new google.maps.Marker({
                    position: latlng,
                    icon: fireIcon,
                    title: feature.properties.Municipio || 'Desconhecido',
                    map: map 
                });

                marker.addListener('mouseover', function () {
                    const { DataHora, Municipio, DiaSemChuva } = feature.properties;
                    const popupContent = `
                        <div>
                            <strong>Data e Hora:</strong> ${DataHora || 'Desconhecido'}<br>
                            <strong>Município:</strong> ${Municipio || 'Desconhecido'}<br>
                            <strong>Dias Sem Chuva:</strong> ${DiaSemChuva || 'Desconhecido'}
                        </div>
                    `;
                    const infowindow = new google.maps.InfoWindow({
                        content: popupContent,
                    });
                    infowindow.open(map, marker);
                });

                marker.addListener('mouseout', function () {
                    google.maps.InfoWindow.prototype.close();
                });

                queimadasMarkers.push(marker);
            });

            markerClustererQueimadas = new MarkerClusterer(map, queimadasMarkers, {
                imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
                styles: [{
                    url: 'data/fire-solid.png', 
                    width: 75, 
                    height: 100, 
                    textColor: 'black',
                    textSize: 12,
                    anchorText: [0, 0],
                    textAlignment: 'center'
                }]
            });

            function adjustVisibilityQueimadas() {
                const zoomLevel = map.getZoom();

                if (zoomLevel >= zoomThresholdQueimadas) {
                    queimadasMarkers.forEach(marker => marker.setMap(map));
                    if (markerClustererQueimadas) {
                        markerClustererQueimadas.clearMarkers();
                    }
                } else {
                    queimadasMarkers.forEach(marker => marker.setMap(null));
                    if (markerClustererQueimadas) {
                        markerClustererQueimadas.addMarkers(queimadasMarkers);
                    }
                }
            }

            adjustVisibilityQueimadas();

            google.maps.event.addListener(map, 'zoom_changed', function() {
                adjustVisibilityQueimadas();
            });
        })
        .catch(error => console.error("Erro ao carregar o arquivo GeoJSON de queimadas:", error));
}

function toggleQueimadasLayer(map) {
    const switchButton = document.getElementById('toggle-queimadas');
    if (switchButton.checked) {
        loadQueimadasLayer(map);
    } else {
        queimadasMarkers.forEach(marker => marker.setMap(null));
        queimadasLayer.forEach(layer => layer.setMap(null));
        queimadasMarkers = [];
        if (markerClustererQueimadas) {
            markerClustererQueimadas.clearMarkers();
        }
    }
}

document.getElementById('toggle-queimadas').addEventListener('change', function () {
    toggleQueimadasLayer(map);
});


let lastActivatedToggle = null;
let lastActivatedLayer = null;

function handleToggleActivation(event) {
    const toggle = event.target;
    const layerId = toggle.id;

    if (riscoLayer && riscoLayer.setZIndex) riscoLayer.setZIndex(1); 
    if (arborizacaoLayers && arborizacaoLayers.setZIndex) arborizacaoLayers.setZIndex(999);
    if (queimadasLayer && queimadasLayer.setZIndex) queimadasLayer.setZIndex(999); 
    if (bairrosLayer && bairrosLayer.setZIndex) bairrosLayer.setZIndex(999);
    if (municipiosLayer && municipiosLayer.setZIndex) municipiosLayer.setZIndex(999); 
    if (vegetacaoLayer && vegetacaoLayer.setZIndex) vegetacaoLayer.setZIndex(1);

    switch (layerId) {
        case 'toggle-risco':
            if (riscoLayer && riscoLayer.setZIndex) riscoLayer.setZIndex(10000);
            break;
        case 'toggle-arborizacao':
        case 'toggle-queimadas': 
            if (arborizacaoLayers && arborizacaoLayers.setZIndex) arborizacaoLayers.setZIndex(9999);
            if (queimadasLayer && queimadasLayer.setZIndex) queimadasLayer.setZIndex(9999);
            break;
        case 'toggle-bairros':
        case 'toggle-municipios':
            if (bairrosLayer && bairrosLayer.setZIndex) bairrosLayer.setZIndex(999);
            if (municipiosLayer && municipiosLayer.setZIndex) municipiosLayer.setZIndex(999);
            break;
        case 'toggle-vegetacao':
            if (vegetacaoLayer && vegetacaoLayer.setZIndex) vegetacaoLayer.setZIndex(1);
            break;
    }
}


function openInfoPanel(properties) {
    const infoPanel = document.getElementById("info-panel");
    const bairroId = properties.ID;

    updateDashboard(document.getElementById("info-content"), bairroId);
    fetchBuildingData("eficiencia_energetica");
    fetchBuildingData("grafico_emissoes");
    fetchBuildingData("distribuicao_impacto");

    infoPanel.classList.add("show");
    infoPanel.classList.remove("hide");

    const closeButton = document.getElementById("close-info-panel");
    
    if (closeButton) {
        closeButton.addEventListener("click", closeInfoPanel);
    } else {
        console.warn("Botão de fechar painel não encontrado!");
    }
}


function handleToggleGases() {
    const toggleGases = document.getElementById("toggle-gases");
    console.log("Toggle de gases alterado:", toggleGases.checked);

    if (toggleGases.checked) {
        const lat = map.getCenter().lat();
        const lon = map.getCenter().lng();
        loadWeatherData(lat, lon);
        openInfoPanel({ ID: "informacoes", nome: "Informações gerais" });
    } else {
        closeInfoPanel();
    }
}

document.getElementById("toggle-gases").addEventListener("change", handleToggleGases);

let selectedYear = null; 
let selectedTransport = null; 
let selectedTransportIcon = null;
let selectedLayer = null;

function updateDashboard() {
    if (!selectedYear || !selectedTransport) {
        console.warn('Ano ou transporte não selecionados.');
        return; 
    }

    const transportForUrl = selectedTransport.toUpperCase();

    const dashboardUrl = `http://localhost:8000/dashboard/${encodeURIComponent(transportForUrl)}/${encodeURIComponent(selectedYear)}`;

    const dashboardFrame = document.getElementById("dashboard-frame");

    if (dashboardFrame && dashboardFrame.src !== dashboardUrl) {
        dashboardFrame.src = dashboardUrl;
    }

    fetch(dashboardUrl)
        .then(response => response.text())
        .then(data => {
            const transportDataContainer = document.getElementById("info-content");

            const transportData = `<p>Dados de Transporte: ${data}</p>`;
            
            transportDataContainer.innerHTML = transportDataContainer.innerHTML.replace(/Dados de Transporte:.*/, transportData);
        })
        .catch(error => {
            console.error("Erro ao carregar o dashboard:", error);
        });
}

function selectYear(year) {
    selectedYear = year;

    const yearButtons = document.querySelectorAll('#year-selection button');
    yearButtons.forEach(button => {
        if (button.textContent == year) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });

    if (selectedYear && selectedTransport) {
        updateDashboard();
    }
}

function selectTransportIcon(event) {
    selectedTransport = event.target.title; 

    const transportIcons = document.querySelectorAll('.transport-icon');
    transportIcons.forEach(icon => {
        icon.classList.remove('selected');
    });
    event.target.classList.add('selected'); 

    if (selectedYear && selectedTransport) {
        updateDashboard();
    }
}

document.querySelectorAll('.transport-icon').forEach(icon => {
    icon.addEventListener('click', selectTransportIcon);
});

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

            const container = document.getElementById(containerId);
            container.innerHTML = data;

            const scripts = container.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                eval(scripts[i].innerText); 
            }
        })
        .catch(error => console.error("Erro ao carregar dados dos edifícios:", error));
}

function closeInfoPopup() {
    const infoPanel = document.getElementById("info-panel");
    infoPanel.classList.add("hide");

    const toggleGases = document.getElementById("toggle-gases");
    toggleGases.checked = false;

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
