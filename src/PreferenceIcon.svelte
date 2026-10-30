<script lang="ts">
  import { platform } from "./platform";
  import type { Component } from "svelte";
  export let category: string;
  export let fallback: Component<any>;
  export let size = 30;
  const assets: Record<string, string> = {
    translations: "notebook",
    security: "lock",
    keyboard: "computer",
    appearance: "color-palette",
    organization: "location",
    calculations: "calculator",
    backups: "folder",
    exports: "file-text",
    notifications: "megaphone",
    data: "locker",
    updates: "setting",
  };
</script>

{#if $platform === "macos" && category === "about"}<img
    src="/brand/icon.png"
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    draggable="false"
  />{:else if $platform === "macos" && assets[category]}<img
    src={"/icons/macos/" + assets[category] + ".png"}
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    draggable="false"
  />{:else}<svelte:component this={fallback} {size} />{/if}

<style>
  img {
    object-fit: contain;
    flex: none;
    vertical-align: middle;
  }
</style>
