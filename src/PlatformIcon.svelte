<script lang="ts">
  import type { LucideIcon, LucideProps } from "@lucide/svelte";
  import { platform } from "./platform";
  import { macSymbols, symbolNames } from "./macos-symbols";
  let {
    name,
    fallback: Fallback,
    ...props
  }: LucideProps & { name: string; fallback: LucideIcon } = $props();
  const image = $derived(
    $platform === "macos" ? $macSymbols[symbolNames[name]] : undefined,
  );
  const size = $derived(
    typeof props.size === "number" ? props.size + "px" : props.size || "24px",
  );
</script>

{#if image}<span
    class={["mac-symbol", props.class]}
    style={`width:${size};height:${size};color:${props.color || "currentColor"};-webkit-mask-image:url("${image}");mask-image:url("${image}");${props.style || ""}`}
    aria-hidden={props["aria-hidden"] ??
      (!props["aria-label"] ? "true" : undefined)}
    aria-label={props["aria-label"]}
    role={props.role}
    title={props.title}
  ></span>{:else}<Fallback {...props} />{/if}

<style>
  .mac-symbol {
    display: inline-block;
    flex: none;
    vertical-align: middle;
    background: currentColor;
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
</style>
