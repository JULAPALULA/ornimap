<template>
  <div class="layout">
    <header>
      <h1>Avistamientos de aves en España</h1>
      <p class="subtitle">Últimos {{ daysBack }} días</p>
      <div class="filters">
        <label>
          Comunidad Autónoma
          <select v-model="selectedId" @change="onCommunitySelect">
            <option value="">**Todas**</option>
            <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label>
          Especie
          <div class="combobox">
            <input
              type="text"
              role="combobox"
              :aria-expanded="speciesOpen"
              aria-autocomplete="list"
              v-model="speciesQuery"
              @focus="openSpeciesDropdown"
              @input="openSpeciesDropdown"
              @keydown.esc="closeSpeciesDropdown"
              @blur="closeSpeciesDropdown"
              placeholder="Buscar especie…"
              autocomplete="off"
            />
            <button
              v-if="selectedSpecies"
              type="button"
              class="combobox-clear"
              @mousedown.prevent="clearSpecies"
              aria-label="Quitar filtro de especie"
            >×</button>
            <ul v-if="speciesOpen" class="combobox-list" role="listbox">
              <li class="combobox-option all" role="option" @mousedown.prevent="clearSpecies">**Todas**</li>
              <li
                v-for="s in filteredSpeciesOptions"
                :key="s"
                class="combobox-option"
                :class="{ active: s === selectedSpecies }"
                role="option"
                @mousedown.prevent="selectSpeciesOption(s)"
              >{{ s }}</li>
              <li v-if="!filteredSpeciesOptions.length" class="combobox-empty">Sin resultados</li>
            </ul>
          </div>
        </label>
        <div class="period-group">
          <span class="period-label">Período</span>
          <div class="period-btns">
            <button
              v-for="opt in periodOptions"
              :key="opt.value"
              class="period-btn"
              :class="{ active: daysBack === opt.value }"
              @click="selectPeriod(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>
        <span class="badge" :class="loadingAll ? 'loading' : allPoints.length ? 'ok' : 'err'">
          {{ loadingAll ? 'Cargando…' : allPoints.length ? `${allPoints.length} avistamientos` : errorAll || '' }}
        </span>
      </div>
    </header>

    <main>
      <div class="map-wrap">
        <div id="map"></div>
        <div v-if="loadingAll" class="map-overlay">
          <div class="spinner"></div>
          <span>Cargando avistamientos…</span>
        </div>
        <button
          v-if="selectedId || selectedSpecies"
          type="button"
          class="scroll-hint"
          aria-label="Ir a estadísticas"
          @click="scrollToPanel"
        >⌄</button>
      </div>

      <aside class="panel" ref="panelEl">
        <div v-if="!selectedId && !selectedSpecies" class="placeholder">
          Selecciona una comunidad autónoma o busca una especie para ver estadísticas.
        </div>
        <div v-else>
          <h2>{{ [selectedCommunity?.name, selectedSpecies].filter(Boolean).join(' · ') }}</h2>

          <template v-if="filteredPoints.length">
            <div class="stats-row">
              <div class="stat-box">
                <span class="stat-num">{{ filteredPoints.length }}</span>
                <span class="stat-label">Avistamientos</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ speciesCount }}</span>
                <span class="stat-label">Especies</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ totalIndividuals }}</span>
                <span class="stat-label">Individuos</span>
              </div>
            </div>

            <h3>Top especies (por avistamientos)</h3>
            <canvas ref="speciesChartEl" height="240"></canvas>

            <h3>Avistamientos por día</h3>
            <canvas ref="dateChartEl" height="160"></canvas>

            <h3>Distribución de tamaño de grupo</h3>
            <canvas ref="countChartEl" height="160"></canvas>
          </template>

          <p v-else-if="loadingAll" class="muted">Esperando datos…</p>
          <p v-else class="muted">Sin avistamientos registrados en esta comunidad.</p>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { periodOptions, useAppSetup } from './App.ts'

const speciesChartEl = ref<HTMLCanvasElement | null>(null)
const dateChartEl = ref<HTMLCanvasElement | null>(null)
const countChartEl = ref<HTMLCanvasElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

function scrollToPanel(): void {
  panelEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const {
  communities, allPoints, loadingAll, errorAll, daysBack, selectPeriod,
  selectedId, selectedCommunity, filteredPoints, speciesCount, totalIndividuals,
  onCommunitySelect, speciesQuery, selectedSpecies, speciesOpen, filteredSpeciesOptions,
  openSpeciesDropdown, closeSpeciesDropdown, selectSpeciesOption, clearSpecies,
} = useAppSetup(speciesChartEl, dateChartEl, countChartEl)
</script>

<style src="./App.css"></style>
