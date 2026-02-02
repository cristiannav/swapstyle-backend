export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  # ============== ENUMS ==============

  enum GarmentCategory {
    TOPS
    BOTTOMS
    DRESSES
    OUTERWEAR
    SHOES
    ACCESSORIES
    BAGS
    JEWELRY
    SPORTSWEAR
    SWIMWEAR
    OTHER
  }

  enum GarmentCondition {
    NEW_WITH_TAGS
    LIKE_NEW
    GOOD
    FAIR
    WORN
  }

  enum GarmentStatus {
    ACTIVE
    SWAPPED
    RESERVED
    INACTIVE
  }

  enum SwipeDirection {
    LEFT
    RIGHT
  }

  enum MatchStatus {
    PENDING
    ACCEPTED
    NEGOTIATING
    COMPLETED
    CANCELLED
    EXPIRED
  }

  enum MessageType {
    TEXT
    IMAGE
    GARMENT_OFFER
    LOCATION
    SYSTEM
  }

  enum NotificationType {
    NEW_MATCH
    NEW_MESSAGE
    SUPER_LIKE
    SWAP_COMPLETED
    EVENT_REMINDER
    SYSTEM
  }

  enum EventType {
    SPEED_SWAPPING
    THEMED_SWAP
    LOCAL_MEETUP
    VIRTUAL_SWAP
  }

  # ============== TYPES ==============

  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String
    lastName: String
    avatar: String
    bio: String
    isVerified: Boolean!
    reputationScore: Float!
    createdAt: DateTime!
    profile: UserProfile
    garments(limit: Int, offset: Int): [Garment!]!
    garmentCount: Int!
  }

  type UserProfile {
    id: ID!
    preferredStyles: [String!]!
    preferredSizes: [String!]!
    preferredBrands: [String!]!
    preferredColors: [String!]!
    topSize: String
    bottomSize: String
    shoeSize: String
    city: String
    country: String
    maxDistance: Int
  }

  type GarmentImage {
    id: ID!
    url: String!
    isPrimary: Boolean!
    order: Int!
  }

  type Garment {
    id: ID!
    title: String!
    description: String
    category: GarmentCategory!
    subcategory: String
    brand: String
    size: String!
    color: String!
    condition: GarmentCondition!
    originalPrice: Float
    estimatedValue: Float
    status: GarmentStatus!
    isPromoted: Boolean!
    tags: [String!]!
    images: [GarmentImage!]!
    user: User!
    viewCount: Int!
    likeCount: Int!
    superLikeCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    similar(limit: Int): [Garment!]!
  }

  type Swipe {
    id: ID!
    garment: Garment!
    direction: SwipeDirection!
    createdAt: DateTime!
  }

  type SwipeResult {
    swipe: Swipe!
    isMatch: Boolean!
    match: Match
  }

  type SuperLike {
    id: ID!
    giver: User!
    garment: Garment!
    message: String
    createdAt: DateTime!
  }

  type Match {
    id: ID!
    user1: User!
    user2: User!
    garment1: Garment!
    garment2: Garment
    status: MatchStatus!
    conversation: Conversation
    createdAt: DateTime!
    updatedAt: DateTime!
    otherUser: User!
  }

  type Conversation {
    id: ID!
    match: Match!
    messages(limit: Int, offset: Int): [Message!]!
    lastMessageAt: DateTime
    unreadCount: Int!
  }

  type Message {
    id: ID!
    sender: User!
    content: String!
    type: MessageType!
    metadata: JSON
    isRead: Boolean!
    readAt: DateTime
    createdAt: DateTime!
  }

  type Notification {
    id: ID!
    type: NotificationType!
    title: String!
    body: String!
    data: JSON
    isRead: Boolean!
    readAt: DateTime
    createdAt: DateTime!
  }

  type Event {
    id: ID!
    title: String!
    description: String!
    type: EventType!
    startTime: DateTime!
    endTime: DateTime!
    isVirtual: Boolean!
    address: String
    latitude: Float
    longitude: Float
    meetingUrl: String
    maxParticipants: Int
    imageUrl: String
    participantCount: Int!
    spotsRemaining: Int
    isRegistered: Boolean!
    createdAt: DateTime!
  }

  type MatchStats {
    totalMatches: Int!
    completedSwaps: Int!
    pendingMatches: Int!
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  type TokenPayload {
    accessToken: String!
    refreshToken: String!
  }

  # ============== PAGINATION ==============

  type PageInfo {
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  type GarmentConnection {
    items: [Garment!]!
    pageInfo: PageInfo!
  }

  type MatchConnection {
    items: [Match!]!
    pageInfo: PageInfo!
  }

  type ConversationConnection {
    items: [Conversation!]!
    pageInfo: PageInfo!
  }

  type NotificationConnection {
    items: [Notification!]!
    pageInfo: PageInfo!
  }

  type EventConnection {
    items: [Event!]!
    pageInfo: PageInfo!
  }

  # ============== INPUTS ==============

  input RegisterInput {
    email: String!
    password: String!
    username: String!
    firstName: String
    lastName: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateUserInput {
    firstName: String
    lastName: String
    bio: String
    avatar: String
    phone: String
  }

  input UpdateProfileInput {
    preferredStyles: [String!]
    preferredSizes: [String!]
    preferredBrands: [String!]
    preferredColors: [String!]
    topSize: String
    bottomSize: String
    shoeSize: String
    city: String
    country: String
    maxDistance: Int
  }

  input CreateGarmentInput {
    title: String!
    description: String
    category: GarmentCategory!
    subcategory: String
    brand: String
    size: String!
    color: String!
    condition: GarmentCondition!
    originalPrice: Float
    tags: [String!]
  }

  input UpdateGarmentInput {
    title: String
    description: String
    category: GarmentCategory
    subcategory: String
    brand: String
    size: String
    color: String
    condition: GarmentCondition
    originalPrice: Float
    status: GarmentStatus
    tags: [String!]
  }

  input GarmentFilters {
    category: GarmentCategory
    size: String
    color: String
    condition: GarmentCondition
    brand: String
    minPrice: Float
    maxPrice: Float
  }

  input SwipeInput {
    garmentId: ID!
    direction: SwipeDirection!
  }

  input SuperLikeInput {
    garmentId: ID!
    message: String
  }

  input SendMessageInput {
    content: String!
    type: MessageType
    metadata: JSON
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
  }

  # ============== QUERIES ==============

  type Query {
    # Auth
    me: User

    # Users
    user(id: ID!): User
    userByUsername(username: String!): User
    searchUsers(query: String!, page: Int, limit: Int): [User!]!

    # Garments
    garment(id: ID!): Garment
    garments(filters: GarmentFilters, page: Int, limit: Int, sortBy: String, sortOrder: String): GarmentConnection!
    discoveryFeed(page: Int, limit: Int): GarmentConnection!
    myGarments(page: Int, limit: Int): GarmentConnection!

    # Swipes
    swipeHistory(direction: SwipeDirection): [Swipe!]!
    superLikesReceived: [SuperLike!]!
    superLikesSent: [SuperLike!]!
    superLikesRemaining: Int!

    # Matches
    match(id: ID!): Match
    matches(page: Int, limit: Int): MatchConnection!
    matchStats: MatchStats!

    # Chat
    conversations(page: Int, limit: Int): ConversationConnection!
    messages(conversationId: ID!, page: Int, limit: Int): [Message!]!
    unreadMessagesCount: Int!

    # Notifications
    notifications(page: Int, limit: Int): NotificationConnection!
    unreadNotificationsCount: Int!

    # Events
    event(id: ID!): Event
    upcomingEvents(page: Int, limit: Int): EventConnection!
    nearbyEvents(location: LocationInput!, radius: Int, page: Int, limit: Int): EventConnection!
    myEvents(page: Int, limit: Int): EventConnection!
  }

  # ============== MUTATIONS ==============

  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshTokens(refreshToken: String!): TokenPayload!
    logout(refreshToken: String!): Boolean!
    logoutAll: Boolean!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!

    # Users
    updateUser(input: UpdateUserInput!): User!
    updateProfile(input: UpdateProfileInput!): UserProfile!
    updateLocation(input: LocationInput!): UserProfile!
    deactivateAccount: Boolean!

    # Garments
    createGarment(input: CreateGarmentInput!): Garment!
    updateGarment(id: ID!, input: UpdateGarmentInput!): Garment!
    deleteGarment(id: ID!): Boolean!

    # Swipes
    swipe(input: SwipeInput!): SwipeResult!
    superLike(input: SuperLikeInput!): SuperLike!
    undoSwipe: Boolean!

    # Matches
    updateMatchStatus(matchId: ID!, status: MatchStatus!): Match!
    proposeGarment(matchId: ID!, garmentId: ID!): Match!

    # Chat
    sendMessage(conversationId: ID!, input: SendMessageInput!): Message!
    markAsRead(conversationId: ID!): Boolean!

    # Notifications
    markNotificationAsRead(id: ID!): Boolean!
    markAllNotificationsAsRead: Boolean!
    deleteNotification(id: ID!): Boolean!

    # Events
    registerForEvent(eventId: ID!): Event!
    unregisterFromEvent(eventId: ID!): Boolean!
  }

  # ============== SUBSCRIPTIONS ==============

  type Subscription {
    # Real-time messages
    messageReceived(conversationId: ID!): Message!

    # New matches
    matchCreated: Match!

    # Notifications
    notificationReceived: Notification!

    # Typing indicators
    userTyping(conversationId: ID!): TypingStatus!
  }

  type TypingStatus {
    userId: ID!
    isTyping: Boolean!
  }
`;
