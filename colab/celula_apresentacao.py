# ============================================================
# Apresentação: abre a galáxia com a solução do modelo
# Usa o `model` resolvido no notebook, se existir; rodada sozinha,
# abre com a solução original (Z = 1535).
# ============================================================
import json, os, urllib.request
from google.colab import output

def montar_dados():
    import pyomo.environ as pyo
    from pyomo.repn import generate_standard_repn

    bases = ["Hoth", "Yavin 4", "Dagobah", "Endor"]
    frentes = ["Tatooine", "Naboo", "Bespin", "Kashyyyk", "Lothal"]
    I, J = [1, 2, 3, 4], [1, 2, 3, 4, 5]

    # 1) Dados lidos do próprio modelo Pyomo (coeficientes da função objetivo e das restrições)
    rep = generate_standard_repn(model.obj.expr)
    coef = {id(v): c for v, c in zip(rep.linear_vars, rep.linear_coefs)}

    def coef_y(restricao, i):
        r = generate_standard_repn(restricao.body)
        return {id(v): c for v, c in zip(r.linear_vars, r.linear_coefs)}[id(model.Y[i])]

    capacidades = [model.C6, model.C7, model.C8, model.C9]
    demandas = [model.C1, model.C2, model.C3, model.C4, model.C5]
    problema = {
        "bases": [{"nome": bases[i-1], "custo": coef[id(model.Y[i])], "cap": -coef_y(capacidades[i-1], i)} for i in I],
        "frentes": [{"nome": frentes[j-1], "demanda": pyo.value(demandas[j-1].upper)} for j in J],
        "custo": [[coef[id(model.X[i, j])] for j in J] for i in I],
        "max_bases": pyo.value(model.C10.upper),
    }

    # 2) Solução encontrada pelo GLPK
    x = {(i, j): round(pyo.value(model.X[i, j])) for i in I for j in J}
    y = {i: round(pyo.value(model.Y[i])) for i in I}
    montagem = sum(problema["bases"][i-1]["custo"] * y[i] for i in I)
    solucao = {
        "status": str(results.solver.termination_condition),
        "custo_total": pyo.value(model.obj),
        "custo_montagem": montagem,
        "custo_transporte": pyo.value(model.obj) - montagem,
        "bases": [{"nome": bases[i-1], "aberta": y[i], "capacidade": problema["bases"][i-1]["cap"],
                   "enviado": sum(x[i, j] for j in J)} for i in I],
        "rotas": [{"de": bases[i-1], "para": frentes[j-1], "caixas": x[i, j],
                   "custo_unit": problema["custo"][i-1][j-1]} for i in I for j in J if x[i, j] > 0],
        "restricao_seguranca": {"limite": problema["max_bases"], "usado": sum(y.values())},
    }
    return {"problema": problema, "solucao": solucao}

if "model" in globals() and "results" in globals():
    dados = montar_dados()
    origem = "solução do modelo resolvido neste notebook"
else:
    dados = None
    origem = "solução original (o modelo ainda não foi resolvido nesta sessão)"

# 3) Baixa a página, injeta os dados e salva
URL = "https://raw.githubusercontent.com/calilmf/operacao-base-oculta/main/apresentacao.html"
html = urllib.request.urlopen(URL).read().decode("utf-8")
marcador = "window.SOLUCAO_COLAB = null;"
assert marcador in html, "Página da apresentação não reconhecida"
if dados:
    html = html.replace(marcador, "window.SOLUCAO_COLAB = " + json.dumps(dados) + ";")
PASTA = "/content/apresentacao"
os.makedirs(PASTA, exist_ok=True)
ARQUIVO = os.path.join(PASTA, "index.html")
with open(ARQUIVO, "w", encoding="utf-8") as f:
    f.write(html)

# 4) Servidor dentro do próprio Colab, numa porta livre, conferido antes de abrir
import threading, http.server
from IPython.display import display, HTML
from google.colab import files
from google.colab.output import eval_js

class Pagina(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=PASTA, **k)
    def log_message(self, *a):
        pass

if "_servidor_apresentacao" in globals():
    _servidor_apresentacao.shutdown()
    _servidor_apresentacao.server_close()
_servidor_apresentacao = http.server.ThreadingHTTPServer(("0.0.0.0", 0), Pagina)
porta = _servidor_apresentacao.server_address[1]
threading.Thread(target=_servidor_apresentacao.serve_forever, daemon=True).start()
with urllib.request.urlopen(f"http://127.0.0.1:{porta}/index.html") as resp:
    assert resp.status == 200 and marcador.split(" =")[0] in resp.read().decode("utf-8"), "Servidor não respondeu"

print("Apresentação aberta com a", origem)
if dados:
    print("Status:", dados["solucao"]["status"], "| Z =", dados["solucao"]["custo_total"], "mil créditos")

link = eval_js(f"google.colab.kernel.proxyPort({porta}, {{'cache': false}})").rstrip("/") + "/index.html"
display(HTML(f'''<p><a href="{link}" target="_blank" style="display:inline-block;padding:10px 18px;border-radius:8px;
background:#f5a623;color:#111;font-weight:700;text-decoration:none">▶ Abrir apresentação em TELA CHEIA (nova aba)</a></p>'''))
print("Prévia embutida (clique dentro dela e use as setas ← →):")
output.serve_kernel_port_as_iframe(porta, path="/index.html", height=720)

# 5) Cópia de segurança: baixa o HTML (abre com dois cliques, até sem internet)
BAIXAR_COPIA = True
if BAIXAR_COPIA:
    copia = "/content/apresentacao_base_oculta.html"
    with open(copia, "w", encoding="utf-8") as f:
        f.write(html)
    files.download(copia)
