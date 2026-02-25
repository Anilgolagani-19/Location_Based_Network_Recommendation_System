const formContainer = document.getElementById('features-form')
let featureDefs = []

function renderForm(defs) {
  featureDefs = defs
  formContainer.innerHTML = ''
  defs.forEach(f => {
    const fld = document.createElement('div')
    fld.className = 'field'
    const label = document.createElement('label')
    label.textContent = f.name
    fld.appendChild(label)

    let input
    if (f.type === 'checkbox') {
      input = document.createElement('input')
      input.type = 'checkbox'
      input.id = 'feat_' + f.name
    } else if (f.type === 'number') {
      input = document.createElement('input')
      input.type = 'number'
      input.step = 'any'
      input.id = 'feat_' + f.name
    } else {
      input = document.createElement('input')
      input.type = 'text'
      input.id = 'feat_' + f.name
    }
    fld.appendChild(input)
    formContainer.appendChild(fld)
  })
}

async function loadDefs() {
  try {
    const res = await fetch('../dashboards/churn-features.json')
    if (!res.ok) throw new Error('failed to fetch feature definitions')
    const defs = await res.json()
    renderForm(defs)
  } catch (e) {
    // try relative path fallback
    try {
      const res2 = await fetch('churn-features.json')
      const defs2 = await res2.json()
      renderForm(defs2)
    } catch (e2) {
      formContainer.textContent = 'Could not load feature definitions.'
    }
  }
}

function collectFeatures() {
  const obj = {}
  featureDefs.forEach(f => {
    const el = document.getElementById('feat_' + f.name)
    if (!el) return
    if (f.type === 'checkbox') {
      obj[f.name] = el.checked
    } else if (f.type === 'number') {
      const v = el.value
      obj[f.name] = v === '' ? null : Number(v)
    } else {
      obj[f.name] = el.value
    }
  })
  return obj
}

document.getElementById('predict').addEventListener('click', async () => {
  const backend = document.getElementById('backend').value.replace(/\/$/, '')
  const model = document.getElementById('model').value
  const features = collectFeatures()
  const payload = { model, features }
  try {
    const res = await fetch(backend + '/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const j = await res.json()
    document.getElementById('output').textContent = JSON.stringify(j, null, 2)
  } catch (err) {
    document.getElementById('output').textContent = 'Request failed: ' + err
  }
})

loadDefs()
