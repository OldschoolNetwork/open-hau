<script lang="ts">
 import {languageOverrides} from "./localization";
  import { onMount } from 'svelte';
  import { Save, LogOut, X } from '@lucide/svelte';
  import { translator } from './i18n';
  export let language: 'ru'|'ro'|"en";
  export let exiting = false;
  export let onchoose: (choice: 'save'|'discard'|'cancel') => void;
  let cancelButton: HTMLButtonElement, dialog: HTMLDialogElement;
  $: t = translator(language,$languageOverrides);
  onMount(() => { dialog.showModal(); cancelButton?.focus(); });
</script>
  <dialog bind:this={dialog} class="save-dialog" aria-labelledby="save-question" oncancel={e=>{e.preventDefault();onchoose('cancel');}}>
    <h2 id="save-question">{t('Сохранить изменения?', 'Salvați modificările?')}</h2>
    <p>{t('Можно сохранить базу, продолжить без сохранения или вернуться к работе. Уже сохранённые изменения останутся в файле.', 'Puteți salva baza, continua fără salvare sau reveni la lucru. Modificările deja salvate rămân în fișier.')}</p>
    <footer>
      <button class="button primary" onclick={() => onchoose('save')}><Save size={16}/>{exiting?t('Сохранить и выйти','Salvează și ieși'):t('Сохранить и продолжить','Salvează și continuă')}</button>
      <button class="button secondary" onclick={() => onchoose('discard')}><LogOut size={16}/>{exiting?t('Выйти без сохранения','Ieși fără salvare'):t('Продолжить без сохранения','Continuă fără salvare')}</button>
      <button bind:this={cancelButton} class="button secondary" onclick={() => onchoose('cancel')}><X size={16}/>{t('Отмена','Anulează')}</button>
    </footer>
  </dialog>
<style>
  .save-dialog::backdrop{background:#0006}
  .save-dialog{background:var(--surface);color:var(--text);border:0;box-shadow:0 12px 40px #0006;padding:24px;width:min(660px,calc(100% - 40px));box-sizing:border-box;backdrop-filter:blur(24px)}
  h2{font-size:21px;margin:0 0 16px}p{line-height:1.6;margin:0 0 24px}footer{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.button{display:flex;align-items:center;gap:7px}
</style>
