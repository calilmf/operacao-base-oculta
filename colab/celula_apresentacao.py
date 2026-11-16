# ============================================================
# Apresentação: abre a galáxia com a solução do modelo
# Usa o `model` resolvido no notebook, se existir; rodada sozinha,
# abre com a solução original (Z = 1535).
# ============================================================
import json, os, subprocess, time, urllib.request
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
os.makedirs("/content/apresentacao", exist_ok=True)
with open("/content/apresentacao/index.html", "w", encoding="utf-8") as f:
    f.write(html)

# 4) Sobe um servidor local e abre a página
subprocess.run("fuser -k 8000/tcp", shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
subprocess.Popen(["python", "-m", "http.server", "8000", "--directory", "/content/apresentacao"],
                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)

print("Apresentação aberta com a", origem)
if dados:
    print("Status:", dados["solucao"]["status"], "| Z =", dados["solucao"]["custo_total"], "mil créditos")
print("Clique no link abaixo para abrir em TELA CHEIA numa nova aba (recomendado para apresentar):")
output.serve_kernel_port_as_window(8000, path="/index.html")
print("Prévia embutida (clique dentro dela e use as setas ← →):")
output.serve_kernel_port_as_iframe(8000, path="/index.html", height=720)
