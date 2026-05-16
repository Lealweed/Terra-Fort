import json
import os
import uuid
import urllib.request
from pathlib import Path

BASE = os.environ['N8N_BASE_URL'].rstrip('/')
API_KEY = os.environ['N8N_API_KEY']
WORKFLOW_ID = 'VlgumFZiwhDe7ZN8'
ROOT = Path('G:/Terra-Fort')


def load_local_env(path: Path):
    vals = {}
    for line in path.read_text(encoding='utf-8', errors='ignore').splitlines():
        s = line.strip()
        if not s or s.startswith('#') or '=' not in s:
            continue
        k, v = s.split('=', 1)
        vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def api_get(url: str):
    req = urllib.request.Request(url, headers={'X-N8N-API-KEY': API_KEY, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def api_put(url: str, payload: dict):
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='PUT', headers={
        'X-N8N-API-KEY': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, json.loads(r.read().decode('utf-8'))


def get_node(nodes, name: str):
    for node in nodes:
        if node['name'] == name:
            return node
    raise KeyError(name)


def ensure_assignment(assignments: list, name: str, value: str, type_: str = 'string'):
    for item in assignments:
        if item.get('name') == name:
            item['value'] = value
            item['type'] = type_
            return
    assignments.append({
        'id': str(uuid.uuid4()),
        'name': name,
        'value': value,
        'type': type_,
    })


def replace_in_obj(obj, replacements: dict):
    text = json.dumps(obj, ensure_ascii=False)
    for old, new in replacements.items():
        text = text.replace(old, new)
    return json.loads(text)


def main():
    wf = api_get(f'{BASE}/api/v1/workflows/{WORKFLOW_ID}')
    (ROOT / '.hermes-workflow-backup-terrafort-site.json').write_text(json.dumps(wf, ensure_ascii=False, indent=2), encoding='utf-8')

    local_env = load_local_env(ROOT / '.env.local')
    shared_secret = local_env.get('N8N_SHARED_SECRET', '')

    wf = replace_in_obj(wf, {
        "$('Dados Lead').item.json.Telefone }}_buffer": "$('Dados Lead').item.json.SessionKey }}_buffer",
        "$('Dados Lead').item.json.Telefone }}_status": "$('Dados Lead').item.json.SessionKey }}_status",
        "$json.Telefone }}_status": "$json.SessionKey }}_status",
        "$('Dados Lead').item.json.Telefone }}\"": "$('Dados Lead').item.json.SessionKey }}\"",
    })

    nodes = wf['nodes']
    connections = wf['connections']

    dados_lead = get_node(nodes, 'Dados Lead')
    assignments = dados_lead['parameters']['assignments']['assignments']
    ensure_assignment(
        assignments,
        'SessionKey',
        "={{ (() => { const body = $('Gatilho').item.json.body || {}; const digits = (v) => String(v || '').replace(/\\D/g, ''); if (body?.event === 'terrafort.support_intake') { return digits(body.customer?.phone) || String(body.customer?.email || '').trim().toLowerCase() || ('site_' + String(body.metadata?.requestedAt || $now.toISO()).replace(/[^0-9A-Za-z]/g, '')); } return digits(body.data?.key?.remoteJid?.match(/\\d+(?=@)/)?.[0] || '') || ('wa_' + String(body.data?.pushName || 'cliente').toLowerCase().replace(/[^a-z0-9]/g, '')); })() }}",
    )

    cliente_existe = get_node(nodes, 'Cliente existe?')
    cond = cliente_existe['parameters']['conditions']['conditions'][0]
    cond['leftValue'] = "={{ $json.id || (($('Dados Lead').item.json.Telefone || $('Dados Lead').item.json.Email) ? '' : 'anonymous-site-lead') }}"
    cond['operator'] = {
        'type': 'string',
        'operation': 'exists',
        'singleValue': True,
    }

    if not any(node['name'] == 'Buscar Contexto Site' for node in nodes):
        nodes.append({
            'parameters': {
                'method': 'GET',
                'url': 'https://www.terrafort.site/api/agent-context',
                'sendQuery': True,
                'queryParameters': {
                    'parameters': [
                        {'name': 'phone', 'value': "={{ $('Dados Lead').item.json.Telefone || '' }}"},
                        {'name': 'email', 'value': "={{ $('Dados Lead').item.json.Email || '' }}"},
                        {'name': 'orderCode', 'value': "={{ $('Gatilho').item.json.body?.metadata?.orderCode || $('Gatilho').item.json.body?.orderCode || '' }}"},
                        {'name': 'productQuery', 'value': "={{ $('Gatilho').item.json.body?.product?.name || $('Gatilho').item.json.body?.message || '' }}"},
                    ]
                },
                'sendHeaders': True,
                'headerParameters': {
                    'parameters': [
                        {'name': 'x-integration-key', 'value': shared_secret}
                    ]
                },
                'options': {}
            },
            'id': str(uuid.uuid4()),
            'name': 'Buscar Contexto Site',
            'type': 'n8n-nodes-base.httpRequest',
            'typeVersion': 4.2,
            'position': [4380, 930],
        })

    if not any(node['name'] == 'Telefone disponível?' for node in nodes):
        nodes.append({
            'parameters': {
                'conditions': {
                    'options': {
                        'caseSensitive': True,
                        'leftValue': '',
                        'typeValidation': 'strict',
                        'version': 2,
                    },
                    'conditions': [
                        {
                            'id': str(uuid.uuid4()),
                            'leftValue': "={{ $('Dados Lead').item.json.Telefone }}",
                            'rightValue': '',
                            'operator': {
                                'type': 'string',
                                'operation': 'notEmpty',
                                'singleValue': True,
                            },
                        }
                    ],
                    'combinator': 'and',
                },
                'options': {},
            },
            'id': str(uuid.uuid4()),
            'name': 'Telefone disponível?',
            'type': 'n8n-nodes-base.if',
            'typeVersion': 2.2,
            'position': [6400, 1100],
        })

    connections['Mensagem'] = {'main': [[{'node': 'Buscar Contexto Site', 'type': 'main', 'index': 0}]]}
    connections['Buscar Contexto Site'] = {'main': [[{'node': 'Encontrar Cliente', 'type': 'main', 'index': 0}]]}
    connections['Loop Over Items']['main'][1] = [{'node': 'Telefone disponível?', 'type': 'main', 'index': 0}]
    connections['Telefone disponível?'] = {
        'main': [
            [{'node': 'Enviar Mensagem', 'type': 'main', 'index': 0}],
            [{'node': 'Wait1', 'type': 'main', 'index': 0}],
        ]
    }

    agente = get_node(nodes, 'Agente IA')
    system_message = agente['parameters']['options']['systemMessage']
    extra = (
        "\n\n<ContextoSite>\n{{ JSON.stringify($('Buscar Contexto Site').item.json || {}) }}\n</ContextoSite>"
        "\n\nRegras extras de contexto:"
        "\n- Quando <ContextoSite> vier preenchido, use-o como fonte principal para produtos, pedidos, promoções, estoque, cadastro e status operacional."
        "\n- Se o contexto do site trouxer produtos compatíveis com a pergunta, cite nome, categoria, preço, estoque e se está sob consulta."
        "\n- Se o contexto trouxer pedidos do cliente, use orderCode, status, pagamento, itens e timeline para responder."
        "\n- Se não houver telefone no lead de origem do site, não invente canal de retorno e mantenha a resposta preparada apenas com base no contexto."
    )
    if '<ContextoSite>' not in system_message:
        agente['parameters']['options']['systemMessage'] = system_message + extra

    payload = {
        'name': wf['name'],
        'nodes': nodes,
        'connections': connections,
        'settings': {},
    }
    (ROOT / '.hermes-workflow-terrafort-site-updated.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

    status, response = api_put(f'{BASE}/api/v1/workflows/{WORKFLOW_ID}', payload)
    print(json.dumps({'status': status, 'updatedWorkflow': response.get('name'), 'nodeCount': len(nodes)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
