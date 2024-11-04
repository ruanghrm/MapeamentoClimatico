// Inicialização do mapa
const map = L.map('map').setView([-1.4558, -48.4902], 12);
let selectedLayer = null;
let selectedYearButton = null;
let selectedTransportIcon = null;

// Camada de mapas base
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Função de estilo dos bairros
function style(feature) {
    return {
        color: "#2262CC",
        weight: 1.2,
        opacity: 1,
        fillOpacity: 0.25
    };
}

// Destaque visual ao passar o mouse sobre um bairro
function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 2,
        color: "#666",
        fillOpacity: 0.35
    });
}

// Restaura o estilo ao remover o mouse do bairro
function resetHighlight(e) {
    if (e.target !== selectedLayer) {
        geoJsonLayer.resetStyle(e.target);
    }
}

// Clique em um bairro para abrir o painel de informações
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

// Carregar e exibir os bairros de Belém
let geoJsonLayer;
fetch("data/Bairros_Belem.geojson")
    .then(response => {
        if (!response.ok) throw new Error('Erro ao carregar o arquivo GEOJSON');
        return response.json();
    })
    .then(data => {
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

// Abre o painel de informações
function openInfoPanel(properties) {
    const infoPanel = document.getElementById("info-panel");
    const bairroId = properties.ID;

    // Atualiza o dashboard e busca dados de edifícios
    updateDashboard(document.getElementById("info-content"), bairroId);

    fetchBuildingData("eficiencia_energetica");
    fetchBuildingData("grafico_emissoes");
    fetchBuildingData("distribuicao_impacto");

    infoPanel.classList.add("show");
    infoPanel.classList.remove("hide");
}

// Buscar dados dos edifícios e atualizar o gráfico
function fetchBuildingData(tipoAnalise) {
    const buildingDataUrl = `http://127.0.0.1:8000/gerar_grafico/${tipoAnalise}`;

    fetch(buildingDataUrl)
        .then(response => {
            console.log("Response status:", response.status);
            console.log("Content-Type:", response.headers.get("Content-Type"));

            if (!response.ok) {
                throw new Error(`Erro na requisição! status: ${response.status}`);
            }

            return response.text(); // Retorna a resposta como texto
        })
        .then(data => {
            console.log(`Dados recebidos para ${tipoAnalise}:`, data); // Log dos dados recebidos

            // Exibe o HTML recebido no painel
            const containerId = tipoAnalise === "eficiencia_energetica" ? 'building-chart' :
                tipoAnalise === "grafico_emissoes" ? 'emissions-chart' :
                'impact-chart';

            document.getElementById(containerId).innerHTML = data; // Coloca o HTML recebido no contêiner apropriado

            // Se necessário, execute o código do gráfico aqui, se você estiver recebendo o script para renderizar o gráfico
            const scripts = document.getElementById(containerId).getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                eval(scripts[i].innerText);
            }
        })
        .catch(error => console.error("Erro ao carregar dados dos edifícios:", error));
}

// Fecha o painel de informações e redefine o estilo
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

// Seleciona o ano e atualiza o botão de seleção
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

// Função para atualizar o dashboard
function updateDashboard(infoContent, bairroId) {
    const selectedYear = selectedYearButton ? selectedYearButton.textContent : null;
    const selectedTransport = selectedTransportIcon ? selectedTransportIcon.title.toUpperCase() : null;

    if (selectedYear && selectedTransport && bairroId !== null) {
        const dashboardUrl = `http://localhost:8000/dashboard/${encodeURIComponent(selectedTransport)}/${encodeURIComponent(selectedYear)}`;

        const dashboardFrame = document.getElementById("dashboard-frame");

        // Apenas atualiza o src do iframe se for diferente
        if (dashboardFrame.src !== dashboardUrl) {
            dashboardFrame.src = dashboardUrl;
        }

 

        fetch(dashboardUrl)
            .then(response => {
                return response.json();
            })
            .then(data => {
                infoContent.innerHTML = `<p>Dados de Transporte: ${JSON.stringify(data, null, 2)}</p>`;
            })
            .catch(error => console.error("Erro ao carregar o dashboard:", error));
    } else {
        console.warn('Ano ou transporte não selecionados, ou ID do bairro é nulo.');
    }
}

// Eventos para os botões de ano
document.querySelectorAll('#year-selection button').forEach(button => {
    button.addEventListener('click', function () {
        selectYear(parseInt(this.textContent));
    });
});

// Eventos para os ícones de transporte
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
