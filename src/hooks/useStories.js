// Re-export from StoriesContext for backward compatibility
// All story state is now shared via React Context instead of per-component hook state
export { useStories } from '../contexts/StoriesContext';
export { useStories as default } from '../contexts/StoriesContext';
