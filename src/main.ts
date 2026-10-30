import { mount } from "svelte";
import App from "./App.svelte";
import "./style.css";
import "./platform.css";
import "./desktop.css";
import "./macos.css";
mount(App, { target: document.getElementById("app")! });
