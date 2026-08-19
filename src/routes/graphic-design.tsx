/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { Route as rootRouteImport } from './routes/__root'
import { Route as WheelRouteImport } from './routes/wheel'
import { Route as WatermarkRouteImport } from './routes/watermark'
import { Route as TasksRouteImport } from './routes/tasks'
import { Route as SocialRouteImport } from './routes/social'
import { Route as ShortsRouteImport } from './routes/shorts'
import { Route as ProfileRouteImport } from './routes/profile'
import { Route as ProUpgradeRouteImport } from './routes/pro-upgrade'
import { Route as LoginRouteImport } from './routes/login'
import { Route as LegalRouteImport } from './routes/legal'
import { Route as GraphicDesignRouteImport } from './routes/graphic-design'
import { Route as FreeShortsRouteImport } from './routes/free-shorts'
import { Route as DomainsRouteImport } from './routes/domains'
import { Route as DashboardRouteImport } from './routes/dashboard'
import { Route as ChatRouteImport } from './routes/chat'
import { Route as AudioRouteImport } from './routes/audio'
import { Route as ApplyDeveloperRouteImport } from './routes/apply-developer'
import { Route as ApplyAdminRouteImport } from './routes/apply-admin'
import { Route as AnimeMarketRouteImport } from './routes/anime-market'
import { Route as AdminRouteImport } from './routes/admin'
import { Route as IndexRouteImport } from './routes/index'
import { Route as WorldCupIndexRouteImport } from './routes/world-cup.index'
import { Route as WorldCupPlayRouteImport } from './routes/world-cup.play'
import { Route as WatchIdRouteImport } from './routes/watch.$id'
import { Route as ShortsUploadRouteImport } from './routes/shorts.upload'
import { Route as ShortsIdRouteImport } from './routes/shorts.$id'

// ✅ الاستيرادات بالأسماء الجديدة (بدون شرطة سفلية) حسب جيت هاب
import { Route as GraphicDesignUploadRouteImport } from './routes/graphic-design.upload'
import { Route as GraphicDesignMarketRouteImport } from './routes/graphic-design.market'
import { Route as GraphicDesignGalleryRouteImport } from './routes/graphic-design.gallery'
import { Route as GraphicDesignEditorRouteImport } from './routes/graphic-design.editor'
import { Route as GraphicDesignDashboardRouteImport } from './routes/graphic-design.dashboard'
import { Route as GenerateVideoRouteImport } from './routes/generate.video'
import { Route as GenerateGokuRouteImport } from './routes/generate.goku'
import { Route as AnimeMarketIdRouteImport } from './routes/anime-market.$id'
import { Route as GraphicDesignProfileUserIdRouteImport } from './routes/graphic-design.profile.$userId'
import { Route as GraphicDesignMarketListingIdRouteImport } from './routes/graphic-design.market.$listingId'
import { Route as ApiPublicFatoraSuccessRouteImport } from './routes/api/public/fatora/success'
import { Route as ApiPublicCreditsDeductRouteImport } from './routes/api/public/credits/deduct'

const WheelRoute = WheelRouteImport.update({
  id: '/wheel',
  path: '/wheel',
  getParentRoute: () => rootRouteImport,
} as any)
const WatermarkRoute = WatermarkRouteImport.update({
  id: '/watermark',
  path: '/watermark',
  getParentRoute: () => rootRouteImport,
} as any)
const TasksRoute = TasksRouteImport.update({
  id: '/tasks',
  path: '/tasks',
  getParentRoute: () => rootRouteImport,
} as any)
const SocialRoute = SocialRouteImport.update({
  id: '/social',
  path: '/social',
  getParentRoute: () => rootRouteImport,
} as any)
const ShortsRoute = ShortsRouteImport.update({
  id: '/shorts',
  path: '/shorts',
  getParentRoute: () => rootRouteImport,
} as any)
const ProfileRoute = ProfileRouteImport.update({
  id: '/profile',
  path: '/profile',
  getParentRoute: () => rootRouteImport,
} as any)
const ProUpgradeRoute = ProUpgradeRouteImport.update({
  id: '/pro-upgrade',
  path: '/pro-upgrade',
  getParentRoute: () => rootRouteImport,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const LegalRoute = LegalRouteImport.update({
  id: '/legal',
  path: '/legal',
  getParentRoute: () => rootRouteImport,
} as any)
const GraphicDesignRoute = GraphicDesignRouteImport.update({
  id: '/graphic-design',
  path: '/graphic-design',
  getParentRoute: () => rootRouteImport,
} as any)
const FreeShortsRoute = FreeShortsRouteImport.update({
  id: '/free-shorts',
  path: '/free-shorts',
  getParentRoute: () => rootRouteImport,
} as any)
const DomainsRoute = DomainsRouteImport.update({
  id: '/domains',
  path: '/domains',
  getParentRoute: () => rootRouteImport,
} as any)
const DashboardRoute = DashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => rootRouteImport,
} as any)
const ChatRoute = ChatRouteImport.update({
  id: '/chat',
  path: '/chat',
  getParentRoute: () => rootRouteImport,
} as any)
const AudioRoute = AudioRouteImport.update({
  id: '/audio',
  path: '/audio',
  getParentRoute: () => rootRouteImport,
} as any)
const ApplyDeveloperRoute = ApplyDeveloperRouteImport.update({
  id: '/apply-developer',
  path: '/apply-developer',
  getParentRoute: () => rootRouteImport,
} as any)
const ApplyAdminRoute = ApplyAdminRouteImport.update({
  id: '/apply-admin',
  path: '/apply-admin',
  getParentRoute: () => rootRouteImport,
} as any)
const AnimeMarketRoute = AnimeMarketRouteImport.update({
  id: '/anime-market',
  path: '/anime-market',
  getParentRoute: () => rootRouteImport,
} as any)
const AdminRoute = AdminRouteImport.update({
  id: '/admin',
  path: '/admin',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const WorldCupIndexRoute = WorldCupIndexRouteImport.update({
  id: '/world-cup/',
  path: '/world-cup/',
  getParentRoute: () => rootRouteImport,
} as any)
const WorldCupPlayRoute = WorldCupPlayRouteImport.update({
  id: '/world-cup/play',
  path: '/world-cup/play',
  getParentRoute: () => rootRouteImport,
} as any)
const WatchIdRoute = WatchIdRouteImport.update({
  id: '/watch/$id',
  path: '/watch/$id',
  getParentRoute: () => rootRouteImport,
} as any)
const ShortsUploadRoute = ShortsUploadRouteImport.update({
  id: '/upload',
  path: '/upload',
  getParentRoute: () => ShortsRoute,
} as any)
const ShortsIdRoute = ShortsIdRouteImport.update({
  id: '/$id',
  path: '/$id',
  getParentRoute: () => ShortsRoute,
} as any)

// ✅ المسارات دي بقت أبناء لـ GraphicDesignRoute عشان بتستخدم الـ dot (.)
const GraphicDesignUploadRoute = GraphicDesignUploadRouteImport.update({
  id: '/upload',
  path: '/upload',
  getParentRoute: () => GraphicDesignRoute,
} as any)
const GraphicDesignMarketRoute = GraphicDesignMarketRouteImport.update({
  id: '/market',
  path: '/market',
  getParentRoute: () => GraphicDesignRoute,
} as any)
const GraphicDesignGalleryRoute = GraphicDesignGalleryRouteImport.update({
  id: '/gallery',
  path: '/gallery',
  getParentRoute: () => GraphicDesignRoute,
} as any)
const GraphicDesignEditorRoute = GraphicDesignEditorRouteImport.update({
  id: '/editor',
  path: '/editor',
  getParentRoute: () => GraphicDesignRoute,
} as any)
const GraphicDesignDashboardRoute = GraphicDesignDashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => GraphicDesignRoute,
} as any)
const GenerateVideoRoute = GenerateVideoRouteImport.update({
  id: '/generate/video',
  path: '/generate/video',
  getParentRoute: () => rootRouteImport,
} as any)
const GenerateGokuRoute = GenerateGokuRouteImport.update({
  id: '/generate/goku',
  path: '/generate/goku',
  getParentRoute: () => rootRouteImport,
} as any)
const AnimeMarketIdRoute = AnimeMarketIdRouteImport.update({
  id: '/$id',
  path: '/$id',
  getParentRoute: () => AnimeMarketRoute,
} as any)
const GraphicDesignProfileUserIdRoute = GraphicDesignProfileUserIdRouteImport.update({
  id: '/profile/$userId',
  path: '/profile/$userId',
  getParentRoute: () => GraphicDesignRoute,
} as any)
const GraphicDesignMarketListingIdRoute = GraphicDesignMarketListingIdRouteImport.update({
  id: '/market/$listingId',
  path: '/market/$listingId',
  getParentRoute: () => GraphicDesignMarketRoute,
} as any)
const ApiPublicFatoraSuccessRoute = ApiPublicFatoraSuccessRouteImport.update({
  id: '/api/public/fatora/success',
  path: '/api/public/fatora/success',
  getParentRoute: () => rootRouteImport,
} as any)
const ApiPublicCreditsDeductRoute = ApiPublicCreditsDeductRouteImport.update({
  id: '/api/public/credits/deduct',
  path: '/api/public/credits/deduct',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/admin': typeof AdminRoute
  '/anime-market': typeof AnimeMarketRouteWithChildren
  '/apply-admin': typeof ApplyAdminRoute
  '/apply-developer': typeof ApplyDeveloperRoute
  '/audio': typeof AudioRoute
  '/chat': typeof ChatRoute
  '/dashboard': typeof DashboardRoute
  '/domains': typeof DomainsRoute
  '/free-shorts': typeof FreeShortsRoute
  '/graphic-design': typeof GraphicDesignRouteWithChildren
  '/legal': typeof LegalRoute
  '/login': typeof LoginRoute
  '/pro-upgrade': typeof ProUpgradeRoute
  '/profile': typeof ProfileRoute
  '/shorts': typeof ShortsRouteWithChildren
  '/social': typeof SocialRoute
  '/tasks': typeof TasksRoute
  '/watermark': typeof WatermarkRoute
  '/wheel': typeof WheelRoute
  '/anime-market/$id': typeof AnimeMarketIdRoute
  '/graphic-design/dashboard': typeof GraphicDesignDashboardRoute
  '/graphic-design/editor': typeof GraphicDesignEditorRoute
  '/graphic-design/gallery': typeof GraphicDesignGalleryRoute
  '/graphic-design/market': typeof GraphicDesignMarketRouteWithChildren
  '/graphic-design/upload': typeof GraphicDesignUploadRoute
  '/generate/goku': typeof GenerateGokuRoute
  '/generate/video': typeof GenerateVideoRoute
  '/shorts/$id': typeof ShortsIdRoute
  '/shorts/upload': typeof ShortsUploadRoute
  '/watch/$id': typeof WatchIdRoute
  '/world-cup/play': typeof WorldCupPlayRoute
  '/world-cup/': typeof WorldCupIndexRoute
  '/graphic-design/market/$listingId': typeof GraphicDesignMarketListingIdRoute
  '/graphic-design/profile/$userId': typeof GraphicDesignProfileUserIdRoute
  '/api/public/credits/deduct': typeof ApiPublicCreditsDeductRoute
  '/api/public/fatora/success': typeof ApiPublicFatoraSuccessRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/admin': typeof AdminRoute
  '/anime-market': typeof AnimeMarketRouteWithChildren
  '/apply-admin': typeof ApplyAdminRoute
  '/apply-developer': typeof ApplyDeveloperRoute
  '/audio': typeof AudioRoute
  '/chat': typeof ChatRoute
  '/dashboard': typeof DashboardRoute
  '/domains': typeof DomainsRoute
  '/free-shorts': typeof FreeShortsRoute
  '/graphic-design': typeof GraphicDesignRouteWithChildren
  '/legal': typeof LegalRoute
  '/login': typeof LoginRoute
  '/pro-upgrade': typeof ProUpgradeRoute
  '/profile': typeof ProfileRoute
  '/shorts': typeof ShortsRouteWithChildren
  '/social': typeof SocialRoute
  '/tasks': typeof TasksRoute
  '/watermark': typeof WatermarkRoute
  '/wheel': typeof WheelRoute
  '/anime-market/$id': typeof AnimeMarketIdRoute
  '/graphic-design/dashboard': typeof GraphicDesignDashboardRoute
  '/graphic-design/editor': typeof GraphicDesignEditorRoute
  '/graphic-design/gallery': typeof GraphicDesignGalleryRoute
  '/graphic-design/market': typeof GraphicDesignMarketRouteWithChildren
  '/graphic-design/upload': typeof GraphicDesignUploadRoute
  '/generate/goku': typeof GenerateGokuRoute
  '/generate/video': typeof GenerateVideoRoute
  '/shorts/$id': typeof ShortsIdRoute
  '/shorts/upload': typeof ShortsUploadRoute
  '/watch/$id': typeof WatchIdRoute
  '/world-cup/play': typeof WorldCupPlayRoute
  '/world-cup': typeof WorldCupIndexRoute
  '/graphic-design/market/$listingId': typeof GraphicDesignMarketListingIdRoute
  '/graphic-design/profile/$userId': typeof GraphicDesignProfileUserIdRoute
  '/api/public/credits/deduct': typeof ApiPublicCreditsDeductRoute
  '/api/public/fatora/success': typeof ApiPublicFatoraSuccessRoute
}

export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/admin': typeof AdminRoute
  '/anime-market': typeof AnimeMarketRouteWithChildren
  '/apply-admin': typeof ApplyAdminRoute
  '/apply-developer': typeof ApplyDeveloperRoute
  '/audio': typeof AudioRoute
  '/chat': typeof ChatRoute
  '/dashboard': typeof DashboardRoute
  '/domains': typeof DomainsRoute
  '/free-shorts': typeof FreeShortsRoute
  '/graphic-design': typeof GraphicDesignRouteWithChildren
  '/graphic-design/dashboard': typeof GraphicDesignDashboardRoute
  '/graphic-design/editor': typeof GraphicDesignEditorRoute
  '/graphic-design/gallery': typeof GraphicDesignGalleryRoute
  '/graphic-design/market': typeof GraphicDesignMarketRouteWithChildren
  '/graphic-design/market/$listingId': typeof GraphicDesignMarketListingIdRoute
  '/graphic-design/profile/$userId': typeof GraphicDesignProfileUserIdRoute
  '/graphic-design/upload': typeof GraphicDesignUploadRoute
  '/legal': typeof LegalRoute
  '/login': typeof LoginRoute
  '/pro-upgrade': typeof ProUpgradeRoute
  '/profile': typeof ProfileRoute
  '/shorts': typeof ShortsRouteWithChildren
  '/social': typeof SocialRoute
  '/tasks': typeof TasksRoute
  '/watermark': typeof WatermarkRoute
  '/wheel': typeof WheelRoute
  '/anime-market/$id': typeof AnimeMarketIdRoute
  '/generate/goku': typeof GenerateGokuRoute
  '/generate/video': typeof GenerateVideoRoute
  '/shorts/$id': typeof ShortsIdRoute
  '/shorts/upload': typeof ShortsUploadRoute
  '/watch/$id': typeof WatchIdRoute
  '/world-cup/play': typeof WorldCupPlayRoute
  '/world-cup/': typeof WorldCupIndexRoute
  '/api/public/credits/deduct': typeof ApiPublicCreditsDeductRoute
  '/api/public/fatora/success': typeof ApiPublicFatoraSuccessRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/admin'
    | '/anime-market'
    | '/apply-admin'
    | '/apply-developer'
    | '/audio'
    | '/chat'
    | '/dashboard'
    | '/domains'
    | '/free-shorts'
    | '/graphic-design'
    | '/legal'
    | '/login'
    | '/pro-upgrade'
    | '/profile'
    | '/shorts'
    | '/social'
    | '/tasks'
    | '/watermark'
    | '/wheel'
    | '/anime-market/$id'
    | '/graphic-design/dashboard'
    | '/graphic-design/editor'
    | '/graphic-design/gallery'
    | '/graphic-design/market'
    | '/graphic-design/upload'
    | '/generate/goku'
    | '/generate/video'
    | '/shorts/$id'
    | '/shorts/upload'
    | '/watch/$id'
    | '/world-cup/play'
    | '/world-cup/'
    | '/graphic-design/market/$listingId'
    | '/graphic-design/profile/$userId'
    | '/api/public/credits/deduct'
    | '/api/public/fatora/success'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/admin'
    | '/anime-market'
    | '/apply-admin'
    | '/apply-developer'
    | '/audio'
    | '/chat'
    | '/dashboard'
    | '/domains'
    | '/free-shorts'
    | '/graphic-design'
    | '/legal'
    | '/login'
    | '/pro-upgrade'
    | '/profile'
    | '/shorts'
    | '/social'
    | '/tasks'
    | '/watermark'
    | '/wheel'
    | '/anime-market/$id'
    | '/graphic-design/dashboard'
    | '/graphic-design/editor'
    | '/graphic-design/gallery'
    | '/graphic-design/market'
    | '/graphic-design/upload'
    | '/generate/goku'
    | '/generate/video'
    | '/shorts/$id'
    | '/shorts/upload'
    | '/watch/$id'
    | '/world-cup/play'
    | '/world-cup'
    | '/graphic-design/market/$listingId'
    | '/graphic-design/profile/$userId'
    | '/api/public/credits/deduct'
    | '/api/public/fatora/success'
  id:
    | '__root__'
    | '/'
    | '/admin'
    | '/anime-market'
    | '/apply-admin'
    | '/apply-developer'
    | '/audio'
    | '/chat'
    | '/dashboard'
    | '/domains'
    | '/free-shorts'
    | '/graphic-design'
    | '/graphic-design/dashboard'
    | '/graphic-design/editor'
    | '/graphic-design/gallery'
    | '/graphic-design/market'
    | '/graphic-design/market/$listingId'
    | '/graphic-design/profile/$userId'
    | '/graphic-design/upload'
    | '/legal'
    | '/login'
    | '/pro-upgrade'
    | '/profile'
    | '/shorts'
    | '/social'
    | '/tasks'
    | '/watermark'
    | '/wheel'
    | '/anime-market/$id'
    | '/generate/goku'
    | '/generate/video'
    | '/shorts/$id'
    | '/shorts/upload'
    | '/watch/$id'
    | '/world-cup/play'
    | '/world-cup/'
    | '/api/public/credits/deduct'
    | '/api/public/fatora/success'
  fileRoutesById: FileRoutesById
}

interface GraphicDesignMarketRouteChildren {
  GraphicDesignMarketListingIdRoute: typeof GraphicDesignMarketListingIdRoute
}

const GraphicDesignMarketRouteChildren: GraphicDesignMarketRouteChildren = {
  GraphicDesignMarketListingIdRoute: GraphicDesignMarketListingIdRoute,
}

const GraphicDesignMarketRouteWithChildren =
  GraphicDesignMarketRoute._addFileChildren(GraphicDesignMarketRouteChildren)

interface GraphicDesignRouteChildren {
  GraphicDesignDashboardRoute: typeof GraphicDesignDashboardRoute
  GraphicDesignEditorRoute: typeof GraphicDesignEditorRoute
  GraphicDesignGalleryRoute: typeof GraphicDesignGalleryRoute
  GraphicDesignMarketRoute: typeof GraphicDesignMarketRouteWithChildren
  GraphicDesignProfileUserIdRoute: typeof GraphicDesignProfileUserIdRoute
  GraphicDesignUploadRoute: typeof GraphicDesignUploadRoute
}

const GraphicDesignRouteChildren: GraphicDesignRouteChildren = {
  GraphicDesignDashboardRoute: GraphicDesignDashboardRoute,
  GraphicDesignEditorRoute: GraphicDesignEditorRoute,
  GraphicDesignGalleryRoute: GraphicDesignGalleryRoute,
  GraphicDesignMarketRoute: GraphicDesignMarketRouteWithChildren,
  GraphicDesignProfileUserIdRoute: GraphicDesignProfileUserIdRoute,
  GraphicDesignUploadRoute: GraphicDesignUploadRoute,
}

const GraphicDesignRouteWithChildren =
  GraphicDesignRoute._addFileChildren(GraphicDesignRouteChildren)

interface AnimeMarketRouteChildren {
  AnimeMarketIdRoute: typeof AnimeMarketIdRoute
}

const AnimeMarketRouteChildren: AnimeMarketRouteChildren = {
  AnimeMarketIdRoute: AnimeMarketIdRoute,
}

const AnimeMarketRouteWithChildren = AnimeMarketRoute._addFileChildren(
  AnimeMarketRouteChildren,
)

interface ShortsRouteChildren {
  ShortsIdRoute: typeof ShortsIdRoute
  ShortsUploadRoute: typeof ShortsUploadRoute
}

const ShortsRouteChildren: ShortsRouteChildren = {
  ShortsIdRoute: ShortsIdRoute,
  ShortsUploadRoute: ShortsUploadRoute,
}

const ShortsRouteWithChildren =
  ShortsRoute._addFileChildren(ShortsRouteChildren)

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AdminRoute: typeof AdminRoute
  AnimeMarketRoute: typeof AnimeMarketRouteWithChildren
  ApplyAdminRoute: typeof ApplyAdminRoute
  ApplyDeveloperRoute: typeof ApplyDeveloperRoute
  AudioRoute: typeof AudioRoute
  ChatRoute: typeof ChatRoute
  DashboardRoute: typeof DashboardRoute
  DomainsRoute: typeof DomainsRoute
  FreeShortsRoute: typeof FreeShortsRoute
  GraphicDesignRoute: typeof GraphicDesignRouteWithChildren
  LegalRoute: typeof LegalRoute
  LoginRoute: typeof LoginRoute
  ProUpgradeRoute: typeof ProUpgradeRoute
  ProfileRoute: typeof ProfileRoute
  ShortsRoute: typeof ShortsRouteWithChildren
  SocialRoute: typeof SocialRoute
  TasksRoute: typeof TasksRoute
  WatermarkRoute: typeof WatermarkRoute
  WheelRoute: typeof WheelRoute
  GenerateGokuRoute: typeof GenerateGokuRoute
  GenerateVideoRoute: typeof GenerateVideoRoute
  WatchIdRoute: typeof WatchIdRoute
  WorldCupPlayRoute: typeof WorldCupPlayRoute
  WorldCupIndexRoute: typeof WorldCupIndexRoute
  ApiPublicCreditsDeductRoute: typeof ApiPublicCreditsDeductRoute
  ApiPublicFatoraSuccessRoute: typeof ApiPublicFatoraSuccessRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AdminRoute: AdminRoute,
  AnimeMarketRoute: AnimeMarketRouteWithChildren,
  ApplyAdminRoute: ApplyAdminRoute,
  ApplyDeveloperRoute: ApplyDeveloperRoute,
  AudioRoute: AudioRoute,
  ChatRoute: ChatRoute,
  DashboardRoute: DashboardRoute,
  DomainsRoute: DomainsRoute,
  FreeShortsRoute: FreeShortsRoute,
  GraphicDesignRoute: GraphicDesignRouteWithChildren,
  LegalRoute: LegalRoute,
  LoginRoute: LoginRoute,
  ProUpgradeRoute: ProUpgradeRoute,
  ProfileRoute: ProfileRoute,
  ShortsRoute: ShortsRouteWithChildren,
  SocialRoute: SocialRoute,
  TasksRoute: TasksRoute,
  WatermarkRoute: WatermarkRoute,
  WheelRoute: WheelRoute,
  GenerateGokuRoute: GenerateGokuRoute,
  GenerateVideoRoute: GenerateVideoRoute,
  WatchIdRoute: WatchIdRoute,
  WorldCupPlayRoute: WorldCupPlayRoute,
  WorldCupIndexRoute: WorldCupIndexRoute,
  ApiPublicCreditsDeductRoute: ApiPublicCreditsDeductRoute,
  ApiPublicFatoraSuccessRoute: ApiPublicFatoraSuccessRoute,
}

export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
