<template>
  <div class="layout">
    <header>
      <h1>Avistamientos de Aves en España</h1>
      <p class="subtitle">Últimos {{ daysBack }} días</p>
      <div class="filters">
        <label>
          Comunidad Autónoma
          <select v-model="selectedId" @change="onCommunitySelect">
            <option value="">**Todas**</option>
            <option v-for="c in communities" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
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
      </div>

      <aside class="panel">
        <div v-if="!selectedId" class="placeholder">
          Selecciona una comunidad autónoma para ver estadísticas de aves en ese territorio.
        </div>
        <div v-else>
          <h2>{{ selectedCommunity?.name }}</h2>

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

const {
  communities, allPoints, loadingAll, errorAll, daysBack, selectPeriod,
  selectedId, selectedCommunity, filteredPoints, speciesCount, totalIndividuals,
  onCommunitySelect,
} = useAppSetup(speciesChartEl, dateChartEl, countChartEl)
</script>

<style src="./App.css"></style>
