// Лендинг Cars 2 целиком — страница /cars2 из apps/landings
import { cars2 } from '../../landings/app/landings/cars2/config'
import { landingMeta, landingStory } from './landingStory'

export default {
  title: 'Лендинги/Cars 2',
  ...landingMeta
}

export const Cars2 = landingStory(cars2)
