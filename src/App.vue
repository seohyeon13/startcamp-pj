<template>
  <div class="flex-1 flex flex-col">
    <AppHeader />
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
      <HomeView />
      <FestivalView />
      <CommunityView />
      <PlannerView />
    </main>
    <AppFooter />
    <ChatbotPanel />
    <SpotDetailModal />
    <CommunityModals />
  </div>
</template>
<script setup>
import { provide } from 'vue';
import { useYogiuApp } from './composables/useYogiuApp.js';
import { YOGIU_KEY } from './composables/yogiuContext.js';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import ChatbotPanel from './components/ChatbotPanel.vue';
import SpotDetailModal from './components/SpotDetailModal.vue';
import CommunityModals from './components/CommunityModals.vue';
import HomeView from './views/HomeView.vue';
import FestivalView from './views/FestivalView.vue';
import CommunityView from './views/CommunityView.vue';
import PlannerView from './views/PlannerView.vue';
const yogiu = useYogiuApp();
provide(YOGIU_KEY, yogiu);
</script>
