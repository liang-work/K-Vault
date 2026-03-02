<template>
  <section class="card panel">
    <div class="panel-head">
      <h2>Storage Manager</h2>
      <button class="btn" @click="resetForm">New Config</button>
    </div>

    <div class="storage-grid">
      <article class="storage-list">
        <h3>Configured Backends</h3>
        <ul class="list" v-if="items.length">
          <li v-for="item in items" :key="item.id" class="storage-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">{{ item.type }} ¡¤ {{ item.enabled ? 'enabled' : 'disabled' }}</p>
              <p class="muted" v-if="item.isDefault">Default storage</p>
            </div>
            <div class="storage-actions">
              <button class="btn btn-ghost" @click="editItem(item)">Edit</button>
              <button class="btn btn-ghost" @click="testItem(item.id)">Test</button>
              <button class="btn btn-ghost" @click="setDefault(item.id)">Set Default</button>
              <button class="btn btn-danger" @click="removeItem(item.id)">Delete</button>
            </div>
          </li>
        </ul>
        <p v-else class="muted">No storage config yet.</p>
      </article>

      <article class="storage-form">
        <h3>{{ editingId ? 'Edit Storage' : 'Create Storage' }}</h3>
        <form class="form-grid" @submit.prevent="submit">
          <label>
            Name
            <input v-model.trim="form.name" required placeholder="Readable name" />
          </label>

          <label>
            Type
            <select v-model="form.type" @change="hydrateConfigDefaults">
              <option value="telegram">Telegram</option>
              <option value="r2">R2</option>
              <option value="s3">S3</option>
              <option value="discord">Discord</option>
              <option value="huggingface">HuggingFace</option>
            </select>
          </label>

          <div class="toggle-row">
            <label><input v-model="form.enabled" type="checkbox" /> Enabled</label>
            <label><input v-model="form.isDefault" type="checkbox" /> Set as default</label>
          </div>

          <label v-for="field in currentFields" :key="field.key">
            {{ field.label }}
            <input
              v-model.trim="form.config[field.key]"
              :type="field.secret ? 'password' : 'text'"
              :placeholder="field.placeholder"
              :required="field.required"
            />
          </label>

          <div class="form-actions">
            <button class="btn" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
            <button class="btn btn-ghost" type="button" @click="testDraft" :disabled="testing">
              {{ testing ? 'Testing...' : 'Test Current Config' }}
            </button>
          </div>
        </form>
      </article>
    </div>

    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { apiFetch } from '../api/client';

const items = ref([]);
const editingId = ref('');
const saving = ref(false);
const testing = ref(false);
const message = ref('');
const error = ref('');

const FIELD_DEFS = {
  telegram: [
    { key: 'botToken', label: 'Bot Token', required: true, secret: true, placeholder: '123456:ABC...' },
    { key: 'chatId', label: 'Chat ID', required: true, placeholder: '-100xxxx' },
    { key: 'apiBase', label: 'API Base', required: false, placeholder: 'https://api.telegram.org' },
  ],
  r2: [
    { key: 'endpoint', label: 'Endpoint', required: true, placeholder: 'https://xxxx.r2.cloudflarestorage.com' },
    { key: 'region', label: 'Region', required: false, placeholder: 'auto' },
    { key: 'bucket', label: 'Bucket', required: true, placeholder: 'bucket-name' },
    { key: 'accessKeyId', label: 'Access Key ID', required: true, secret: true, placeholder: 'AKIA...' },
    { key: 'secretAccessKey', label: 'Secret Access Key', required: true, secret: true, placeholder: '******' },
  ],
  s3: [
    { key: 'endpoint', label: 'Endpoint', required: true, placeholder: 'https://s3.example.com' },
    { key: 'region', label: 'Region', required: true, placeholder: 'us-east-1' },
    { key: 'bucket', label: 'Bucket', required: true, placeholder: 'bucket-name' },
    { key: 'accessKeyId', label: 'Access Key ID', required: true, secret: true, placeholder: 'AKIA...' },
    { key: 'secretAccessKey', label: 'Secret Access Key', required: true, secret: true, placeholder: '******' },
  ],
  discord: [
    { key: 'webhookUrl', label: 'Webhook URL', required: false, secret: true, placeholder: 'https://discord.com/api/webhooks/...' },
    { key: 'botToken', label: 'Bot Token', required: false, secret: true, placeholder: 'Bot token' },
    { key: 'channelId', label: 'Channel ID', required: false, placeholder: 'channel id' },
  ],
  huggingface: [
    { key: 'token', label: 'HF Token', required: true, secret: true, placeholder: 'hf_xxx' },
    { key: 'repo', label: 'Dataset Repo', required: true, placeholder: 'username/repo' },
  ],
};

const form = reactive({
  name: '',
  type: 'telegram',
  enabled: true,
  isDefault: false,
  config: {},
});

const currentFields = computed(() => FIELD_DEFS[form.type] || []);

onMounted(async () => {
  await loadItems();
  hydrateConfigDefaults();
});

function hydrateConfigDefaults() {
  const existing = { ...(form.config || {}) };
  const next = {};
  for (const field of currentFields.value) {
    next[field.key] = existing[field.key] ?? '';
  }
  form.config = next;
}

async function loadItems() {
  try {
    const data = await apiFetch('/api/storage/list');
    items.value = data.items || [];
  } catch (err) {
    error.value = err.message;
  }
}

function resetForm() {
  editingId.value = '';
  form.name = '';
  form.type = 'telegram';
  form.enabled = true;
  form.isDefault = false;
  form.config = {};
  hydrateConfigDefaults();
  message.value = '';
  error.value = '';
}

function editItem(item) {
  editingId.value = item.id;
  form.name = item.name;
  form.type = item.type;
  form.enabled = Boolean(item.enabled);
  form.isDefault = Boolean(item.isDefault);
  form.config = { ...(item.config || {}) };
  hydrateConfigDefaults();
  message.value = '';
  error.value = '';
}

async function submit() {
  saving.value = true;
  error.value = '';
  message.value = '';

  try {
    const payload = {
      name: form.name,
      type: form.type,
      enabled: form.enabled,
      isDefault: form.isDefault,
      config: { ...form.config },
    };

    if (editingId.value) {
      await apiFetch(`/api/storage/${encodeURIComponent(editingId.value)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      message.value = 'Storage config updated.';
    } else {
      await apiFetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      message.value = 'Storage config created.';
    }

    await loadItems();
    if (!editingId.value) {
      resetForm();
    }
  } catch (err) {
    error.value = err.message || 'Save failed';
  } finally {
    saving.value = false;
  }
}

async function testDraft() {
  testing.value = true;
  error.value = '';
  message.value = '';

  try {
    const data = await apiFetch('/api/storage/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: form.type,
        config: form.config,
      }),
    });
    message.value = data.result?.connected ? 'Connection succeeded.' : 'Connection failed.';
  } catch (err) {
    error.value = err.message || 'Connection test failed';
  } finally {
    testing.value = false;
  }
}

async function testItem(id) {
  error.value = '';
  message.value = '';
  try {
    const data = await apiFetch(`/api/storage/${encodeURIComponent(id)}/test`, {
      method: 'POST',
    });
    message.value = data.result?.connected
      ? `Storage ${id} connected.`
      : `Storage ${id} test failed.`;
  } catch (err) {
    error.value = err.message;
  }
}

async function setDefault(id) {
  error.value = '';
  message.value = '';
  try {
    await apiFetch(`/api/storage/default/${encodeURIComponent(id)}`, {
      method: 'POST',
    });
    message.value = 'Default storage updated.';
    await loadItems();
  } catch (err) {
    error.value = err.message;
  }
}

async function removeItem(id) {
  if (!window.confirm('Delete this storage config?')) return;

  error.value = '';
  message.value = '';
  try {
    await apiFetch(`/api/storage/${encodeURIComponent(id)}`, { method: 'DELETE' });
    message.value = 'Storage config deleted.';
    await loadItems();
    if (editingId.value === id) resetForm();
  } catch (err) {
    error.value = err.message;
  }
}
</script>