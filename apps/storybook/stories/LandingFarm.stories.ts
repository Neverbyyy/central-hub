// Лендинг Farm целиком — страница /farm из apps/landings
import { farm } from '../../landings/app/landings/farm/config'
import { landingMeta, landingStory } from './landingStory'

export default {
  title: 'Лендинги/Farm',
  ...landingMeta
}

export const Farm = landingStory(farm)
