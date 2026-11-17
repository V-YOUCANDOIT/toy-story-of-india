import bcrypt from 'bcryptjs';
import { env } from '../config/env.ts';
import { getDb } from './connection.ts';
import { runMigrations } from './migrations.ts';

const IMG = {
  hero: '/src/assets/images/hero_wooden_atelier_1794898610305.jpg',
  blocks: '/src/assets/images/cat_wooden_blocks_1794898609607.jpg',
  bunny: '/src/assets/images/prod_plush_linen_bunny_1794898609734.jpg',
  railway: '/src/assets/images/prod_wooden_railway_1794898610499.jpg',
  abacus: '/src/assets/images/prod_montessori_abacus_1794898610701.jpg',
  puzzle: '/src/assets/images/prod_botanical_puzzle_1794898610930.jpg',
  teaSet: '/src/assets/images/prod_ceramic_tea_set_1794898611716.jpg',
  dollhouse: '/src/assets/images/prod_architect_dollhouse_1794898611746.jpg',
  chess: '/src/assets/images/prod_strategy_board_game_1794898612733.jpg',
  car: '/src/assets/images/prod_vintage_pedal_car_1794898612830.jpg',
  artKit: '/src/assets/images/prod_watercolor_art_kit_1794898613320.jpg',
  rattle: '/src/assets/images/prod_sensory_baby_rattle_1794898613843.jpg',
  rover: '/src/assets/images/prod_solar_robotics_kit_1794898614801.jpg',
  playroom: '/src/assets/images/promo_playroom_craft_1794898614493.jpg',
};

export function seedDatabase(): void {
  runMigrations();
  const db = getDb();

  const seedTx = db.transaction(() => {
    // 1. Seed default store settings
    const settingsEntries: Array<[string, string]> = [
      ['cod_enabled', JSON.stringify(true)],
      ['free_shipping_threshold', JSON.stringify(150)],
      ['shipping_fee', JSON.stringify(12)],
      ['low_stock_threshold', JSON.stringify(5)],
      ['demo_payment_enabled', JSON.stringify(true)],
    ];
    const upsertSetting = db.prepare(
      `INSERT INTO store_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO NOTHING`
    );
    for (const [k, v] of settingsEntries) {
      upsertSetting.run(k, v);
    }

    // 2. Seed initial Admin user (never public registration)
    const existingAdmin = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(env.adminEmail.toLowerCase());
    let adminId: number;
    if (!existingAdmin) {
      const adminHash = bcrypt.hashSync(env.adminPassword, 12);
      const res = db
        .prepare(
          `INSERT INTO users (name, email, phone, password_hash, role, is_active)
           VALUES (?, ?, ?, ?, 'admin', 1)`
        )
        .run(env.adminName, env.adminEmail.toLowerCase(), '+1 (555) 204-8800', adminHash);
      adminId = Number(res.lastInsertRowid);
    } else {
      adminId = (existingAdmin as { id: number }).id;
    }

    // 3. Seed a realistic Demo Customer for convenience
    const demoEmail = 'claire.bennett@example.com';
    const existingCustomer = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(demoEmail);
    let customerId: number;
    if (!existingCustomer) {
      const custHash = bcrypt.hashSync('Customer2026!', 12);
      const res = db
        .prepare(
          `INSERT INTO users (name, email, phone, password_hash, role, is_active)
           VALUES (?, ?, ?, ?, 'customer', 1)`
        )
        .run('Claire Bennett', demoEmail, '+1 (555) 391-4420', custHash);
      customerId = Number(res.lastInsertRowid);

      db.prepare(
        `INSERT INTO addresses (user_id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default)
         VALUES (?, 'Home', 'Claire Bennett', '+1 (555) 391-4420', '418 Waverly Place', 'Suite 3B', 'New York', 'NY', '10014', 'United States', 1)`
      ).run(customerId);
    } else {
      customerId = (existingCustomer as { id: number }).id;
    }

    // 4. Seed all 12 requested categories
    const categoriesData = [
      {
        name: 'Educational Toys',
        slug: 'educational-toys',
        description: 'Montessori-inspired numeracy, logic, and tactile early learning objects crafted from European hardwoods.',
        image_url: IMG.abacus,
        display_order: 1,
      },
      {
        name: 'Soft Toys & Plushies',
        slug: 'soft-toys-plushies',
        description: 'Heirloom organic linen and merino-knit companions made for gentle comfort and lifelong keepsakes.',
        image_url: IMG.bunny,
        display_order: 2,
      },
      {
        name: 'Building Blocks',
        slug: 'building-blocks',
        description: 'Architectural beechwood arches, towers, and modular geometry sets dyed with botanical water-based pigments.',
        image_url: IMG.blocks,
        display_order: 3,
      },
      {
        name: 'Board Games',
        slug: 'board-games',
        description: 'Turned walnut and maple family strategy games designed to live proudly on the living room table.',
        image_url: IMG.chess,
        display_order: 4,
      },
      {
        name: 'Puzzles',
        slug: 'puzzles',
        description: 'Hand-illustrated heirloom wooden jigsaw puzzles celebrating woodland flora, fauna, and patient discovery.',
        image_url: IMG.puzzle,
        display_order: 5,
      },
      {
        name: 'Remote Control Toys',
        slug: 'remote-control-toys',
        description: 'Precision mechanical rovers, clockwork explorers, and tactile engineered vehicles for curious builders.',
        image_url: IMG.rover,
        display_order: 6,
      },
      {
        name: 'Outdoor Toys',
        slug: 'outdoor-toys',
        description: 'Classic steel ride-on racers, garden explorers, and timeless open-air play essentials.',
        image_url: IMG.car,
        display_order: 7,
      },
      {
        name: 'Baby Toys',
        slug: 'baby-toys',
        description: 'Untreated maple wood teethers and hand-crocheted organic cotton rattles safe for earliest sensory milestones.',
        image_url: IMG.rattle,
        display_order: 8,
      },
      {
        name: 'Creative & DIY Kits',
        slug: 'creative-diy-kits',
        description: 'Solid oak art cases, botanical watercolor palettes, and guided studio craft sets for young artists.',
        image_url: IMG.artKit,
        display_order: 9,
      },
      {
        name: 'Action Figures',
        slug: 'action-figures',
        description: 'Articulated wooden woodland travelers and miniature heritage figures built for storytelling.',
        image_url: IMG.hero,
        display_order: 10,
      },
      {
        name: 'Dolls & Pretend Play',
        slug: 'dolls-pretend-play',
        description: 'Scandinavian birchwood dollhouses, miniature stoneware tea sets, and imaginative domestic worlds.',
        image_url: IMG.dollhouse,
        display_order: 11,
      },
      {
        name: 'Wooden Toys',
        slug: 'wooden-toys',
        description: 'Hand-turned walnut trains, timber carriages, and heirloom wooden collectibles crafted for generations.',
        image_url: IMG.railway,
        display_order: 12,
      },
    ];

    const categoryMap: Record<string, number> = {};
    const insertCat = db.prepare(
      `INSERT INTO categories (name, slug, description, image_url, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(slug) DO NOTHING`
    );
    const getCat = db.prepare('SELECT id FROM categories WHERE slug = ?');

    for (const c of categoriesData) {
      insertCat.run(c.name, c.slug, c.description, c.image_url, c.display_order);
      const row = getCat.get(c.slug) as { id: number };
      categoryMap[c.slug] = row.id;
    }

    // 5. Seed Products (only if products table is empty)
    const prodCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
    if (prodCount === 0) {
      const products = [
        {
          name: 'Aurelia Beechwood Architectural Block Set',
          slug: 'aurelia-beechwood-architectural-block-set',
          description:
            'Forty-eight precision-milled European beechwood columns, arches, and gables finished in raw beeswax and muted sage botanical stain. Packaged in a dovetailed linen-lined storage tray.',
          price: 118.0,
          discounted_price: null,
          category_slug: 'building-blocks',
          brand: 'Atelier Nord',
          age_recommendation: '3-5 yrs',
          stock_quantity: 24,
          sku: 'PA-BLK-101',
          specifications: {
            Material: 'FSC-Certified European Beechwood',
            Pieces: '48 architectural forms',
            Finish: 'Raw beeswax & non-toxic water pigment',
            Dimensions: '34 x 26 x 7 cm tray',
            Origin: 'Crafted in Germany',
          },
          images: [IMG.blocks, IMG.hero],
          is_featured: 1,
          is_bestseller: 1,
          is_new_arrival: 0,
          popularity_score: 98,
        },
        {
          name: 'Colette Organic Linen Rabbit',
          slug: 'colette-organic-linen-rabbit',
          description:
            'Hand-sewn from Belgian flax linen and dressed in a removable cable-knit dusty-rose wool cardigan. Weighted gently with organic millet hulls for soothing nursery comfort.',
          price: 68.0,
          discounted_price: 58.0,
          category_slug: 'soft-toys-plushies',
          brand: 'Loom & Linen',
          age_recommendation: '0-12m',
          stock_quantity: 32,
          sku: 'PA-PLS-204',
          specifications: {
            Shell: '100% Belgian Flax Linen',
            Cardigan: 'Merino wool knit (removable)',
            Filling: 'Hypoallergenic organic cotton & millet',
            Height: '38 cm',
            Care: 'Hand wash cold, dry flat',
          },
          images: [IMG.bunny, IMG.hero],
          is_featured: 1,
          is_bestseller: 1,
          is_new_arrival: 1,
          popularity_score: 95,
        },
        {
          name: 'Grand Continental Walnut Steam Railway',
          slug: 'grand-continental-walnut-steam-railway',
          description:
            'An heirloom locomotive and two passenger carriages turned from solid American walnut and rock maple with subtle solid brass couplings and sixteen interlocking wooden track segments.',
          price: 165.0,
          discounted_price: null,
          category_slug: 'wooden-toys',
          brand: 'Maison Bois',
          age_recommendation: '3-5 yrs',
          stock_quantity: 14,
          sku: 'PA-WDN-302',
          specifications: {
            Timber: 'American Black Walnut & Hard Maple',
            Hardware: 'Solid brushed brass couplings',
            TrackLength: '2.4 meters oval circuit',
            Compatibility: 'Universal wooden rail gauge',
          },
          images: [IMG.railway, IMG.hero],
          is_featured: 1,
          is_bestseller: 1,
          is_new_arrival: 0,
          popularity_score: 94,
        },
        {
          name: 'Montessori Botanical Counting Abacus',
          slug: 'montessori-botanical-counting-abacus',
          description:
            'Ten rows of hand-turned beech beads in cream, sage, muted rose, and espresso set on solid brass rods. Designed to cultivate early numeracy, pattern recognition, and tactile focus.',
          price: 74.0,
          discounted_price: null,
          category_slug: 'educational-toys',
          brand: 'Kleine Welt',
          age_recommendation: '1-3 yrs',
          stock_quantity: 19,
          sku: 'PA-EDU-401',
          specifications: {
            Frame: 'Solid oiled beechwood',
            Rods: 'Heavy-gauge solid brass',
            Beads: '100 hand-finished 20mm wooden beads',
            Dimensions: '28 x 29 x 8 cm',
          },
          images: [IMG.abacus],
          is_featured: 1,
          is_bestseller: 1,
          is_new_arrival: 1,
          popularity_score: 91,
        },
        {
          name: 'Nordic Birch Architectural Dollhouse',
          slug: 'nordic-birch-architectural-dollhouse',
          description:
            'Two-story Scandinavian pitched-roof residence crafted from smooth Baltic birch with an open-concept terrace, staircase, and twelve handcrafted miniature room furnishings.',
          price: 245.0,
          discounted_price: 215.0,
          category_slug: 'dolls-pretend-play',
          brand: 'Atelier Nord',
          age_recommendation: '3-5 yrs',
          stock_quantity: 4,
          sku: 'PA-DLP-501',
          specifications: {
            Material: '12mm Baltic Birch Plywood & Solid Beech',
            Includes: '12-piece miniature furniture suite',
            Dimensions: '68 x 58 x 32 cm',
            Assembly: 'Tool-free slot joinery',
          },
          images: [IMG.dollhouse, IMG.playroom],
          is_featured: 1,
          is_bestseller: 0,
          is_new_arrival: 1,
          popularity_score: 89,
        },
        {
          name: 'The Ancient Woods Heirloom Wooden Puzzle',
          slug: 'ancient-woods-heirloom-wooden-puzzle',
          description:
            'Forty-two thick laser-precision birchwood pieces hand-illustrated with woodland foxes, owls, and botanical ferns, presented in a slide-lid walnut keepsake box.',
          price: 54.0,
          discounted_price: null,
          category_slug: 'puzzles',
          brand: 'Oakhaven Craft',
          age_recommendation: '3-5 yrs',
          stock_quantity: 28,
          sku: 'PA-PUZ-601',
          specifications: {
            Pieces: '42 precision-cut timber pieces',
            Box: 'Walnut-stained birch keepsake tray',
            Artwork: 'Archival UV-matte botanical print',
            Dimensions: '32 x 32 cm assembled',
          },
          images: [IMG.puzzle],
          is_featured: 0,
          is_bestseller: 1,
          is_new_arrival: 0,
          popularity_score: 87,
        },
        {
          name: 'Heirloom Stoneware Picnic Tea Basket',
          slug: 'heirloom-stoneware-picnic-tea-basket',
          description:
            'A hand-woven willow hamper containing a floral miniature ceramic teapot, sugar bowl, creamer, two cups with saucers, stainless teaspoons, and organic polka-dot linen napkins.',
          price: 82.0,
          discounted_price: 72.0,
          category_slug: 'dolls-pretend-play',
          brand: 'Loom & Linen',
          age_recommendation: '3-5 yrs',
          stock_quantity: 16,
          sku: 'PA-DLP-509',
          specifications: {
            TeaSet: 'Lead-free glazed stoneware (9 pieces)',
            Hamper: 'Handwoven natural willow wicker',
            Textiles: '2 hemmed flax linen napkins',
            Safety: 'EN71 & ASTM F963 certified',
          },
          images: [IMG.teaSet],
          is_featured: 0,
          is_bestseller: 0,
          is_new_arrival: 1,
          popularity_score: 84,
        },
        {
          name: 'Sovereign Walnut & Maple Chess Set',
          slug: 'sovereign-walnut-maple-chess-set',
          description:
            'Weighted Staunton-inspired chessmen turned from solid walnut and boxwood, paired with a mitered heirloom board edged in satin-oiled hardwood for family evenings.',
          price: 188.0,
          discounted_price: null,
          category_slug: 'board-games',
          brand: 'Maison Bois',
          age_recommendation: '6-8 yrs',
          stock_quantity: 11,
          sku: 'PA-BRD-701',
          specifications: {
            Board: 'Solid inlaid Walnut & Rock Maple (42 cm)',
            Pieces: '32 felted, weighted turned hardwood pieces',
            KingHeight: '78 mm',
            Storage: 'Linen drawstring piece pouch included',
          },
          images: [IMG.chess],
          is_featured: 1,
          is_bestseller: 0,
          is_new_arrival: 0,
          popularity_score: 86,
        },
        {
          name: 'Mille Miglia Sage Heritage Racer',
          slug: 'mille-miglia-sage-heritage-racer',
          description:
            'Pressed powder-coated steel vintage roadster finished in matte atelier sage with stitched saddle-tan seat upholstery, spoked rubber-tread wheels, and functional steering.',
          price: 158.0,
          discounted_price: null,
          category_slug: 'outdoor-toys',
          brand: 'Chronos Play',
          age_recommendation: '1-3 yrs',
          stock_quantity: 3,
          sku: 'PA-OUT-801',
          specifications: {
            Chassis: 'Heavy-gauge powder-coated steel',
            Tires: 'Non-marking solid rubber',
            Dimensions: '74 x 36 x 34 cm',
            MaxLoad: '25 kg',
          },
          images: [IMG.car],
          is_featured: 1,
          is_bestseller: 1,
          is_new_arrival: 0,
          popularity_score: 92,
        },
        {
          name: 'Oak & Pine Botanical Watercolor Atelier Box',
          slug: 'oak-pine-botanical-watercolor-atelier-box',
          description:
            'A portable solid oak studio case fitted with brass clasps, twelve mineral watercolor pans, porcelain mixing palette, three Kolinsky-blend brushes, and a cotton-rag sketchbook.',
          price: 92.0,
          discounted_price: 79.0,
          category_slug: 'creative-diy-kits',
          brand: 'Oakhaven Craft',
          age_recommendation: '6-8 yrs',
          stock_quantity: 22,
          sku: 'PA-ART-901',
          specifications: {
            Case: 'Solid white oak with brass latches',
            Pigments: '12 non-toxic mineral watercolor half-pans',
            Paper: '300gsm cold-press cotton journal (40 pages)',
            Palette: '3-well glazed porcelain dish',
          },
          images: [IMG.artKit],
          is_featured: 0,
          is_bestseller: 1,
          is_new_arrival: 1,
          popularity_score: 90,
        },
        {
          name: 'Sage Crochet & Maple Sensory Baby Suite',
          slug: 'sage-crochet-maple-sensory-baby-suite',
          description:
            'Five heirloom developmental objects for early grasp and soothing: hand-crocheted GOTS organic cotton spheres and raw Vermont maple teething rings finished in organic jojoba oil.',
          price: 48.0,
          discounted_price: null,
          category_slug: 'baby-toys',
          brand: 'Loom & Linen',
          age_recommendation: '0-12m',
          stock_quantity: 38,
          sku: 'PA-BBY-102',
          specifications: {
            Wood: 'Untreated solid sugar maple',
            Yarn: '100% GOTS-certified organic cotton',
            SetIncludes: '2 teething rings, bird rattle, 3 sensory spheres',
            Safety: 'Zero small detachable parts',
          },
          images: [IMG.rattle],
          is_featured: 0,
          is_bestseller: 1,
          is_new_arrival: 0,
          popularity_score: 88,
        },
        {
          name: 'Clockwork Explorer Mechanical STEM Rover',
          slug: 'clockwork-explorer-mechanical-stem-rover',
          description:
            'An intricate build-it-yourself planetary rover engineered from precision-cut birch ply and solid brass gear trains. Wind the spring drive or pair with an optional RC micro-module.',
          price: 134.0,
          discounted_price: null,
          category_slug: 'remote-control-toys',
          brand: 'Chronos Play',
          age_recommendation: '9+ yrs',
          stock_quantity: 15,
          sku: 'PA-STM-110',
          specifications: {
            Parts: '186 interlocking wood & brass components',
            Drive: 'Spring-wound gear train + RC expansion port',
            BuildTime: '3–4 hours guided assembly',
            Manual: 'Illustrated hardcover workshop guide',
          },
          images: [IMG.rover],
          is_featured: 1,
          is_bestseller: 0,
          is_new_arrival: 1,
          popularity_score: 85,
        },
        {
          name: 'Woodland Travelers Articulated Figure Trio',
          slug: 'woodland-travelers-articulated-figure-trio',
          description:
            'Hand-carved European ash figures with supple linen cloaks and articulated joints, crafted to inhabit architectural block castles, dollhouses, and open-ended story worlds.',
          price: 56.0,
          discounted_price: null,
          category_slug: 'action-figures',
          brand: 'Kleine Welt',
          age_recommendation: '3-5 yrs',
          stock_quantity: 21,
          sku: 'PA-FIG-120',
          specifications: {
            Material: 'Turned European ash & natural linen',
            Height: '11 cm per figure',
            Articulation: 'Swivel head and flexible limbs',
            Set: '3 traveler figures with wooden lantern props',
          },
          images: [IMG.hero, IMG.blocks],
          is_featured: 0,
          is_bestseller: 0,
          is_new_arrival: 1,
          popularity_score: 79,
        },
        {
          name: 'Montessori Numeracy & Pattern Tower',
          slug: 'montessori-numeracy-pattern-tower',
          description:
            'Graduated hardwood cylinders and tactile counting rods dyed in soothing earth tones to introduce spatial volume, sequencing, and early mathematical intuition.',
          price: 62.0,
          discounted_price: 52.0,
          category_slug: 'educational-toys',
          brand: 'Kleine Welt',
          age_recommendation: '1-3 yrs',
          stock_quantity: 17,
          sku: 'PA-EDU-415',
          specifications: {
            Material: 'Solid European beechwood',
            Finish: 'Matte water-based plant varnish',
            Pieces: '20 graduated cylinders & sorting board',
          },
          images: [IMG.abacus, IMG.blocks],
          is_featured: 0,
          is_bestseller: 0,
          is_new_arrival: 0,
          popularity_score: 80,
        },
      ];

      const insertProd = db.prepare(
        `INSERT INTO products (
          name, slug, description, price, discounted_price, category_id, brand,
          age_recommendation, stock_quantity, sku, specifications, images,
          is_available, is_featured, is_bestseller, is_new_arrival, popularity_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
      );
      const insertInvLog = db.prepare(
        `INSERT INTO inventory_logs (product_id, change_amount, previous_stock, new_stock, reason, reference_id, created_by)
         VALUES (?, ?, 0, ?, 'initial_seed', 'SEED', ?)`
      );

      for (const p of products) {
        const catId = categoryMap[p.category_slug];
        const info = insertProd.run(
          p.name,
          p.slug,
          p.description,
          p.price,
          p.discounted_price,
          catId,
          p.brand,
          p.age_recommendation,
          p.stock_quantity,
          p.sku,
          JSON.stringify(p.specifications),
          JSON.stringify(p.images),
          p.is_featured,
          p.is_bestseller,
          p.is_new_arrival,
          p.popularity_score
        );
        insertInvLog.run(Number(info.lastInsertRowid), p.stock_quantity, p.stock_quantity, adminId);
      }

      // 6. Seed 1 realistic historical order for demo customer so Admin & Account have real persisted records
      const existingOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number }).count;
      if (existingOrders === 0) {
        const firstProd = db.prepare('SELECT id, name, sku, price, images FROM products WHERE sku = ?').get('PA-PLS-204') as {
          id: number;
          name: string;
          sku: string;
          price: number;
          images: string;
        };
        const secondProd = db.prepare('SELECT id, name, sku, price, images FROM products WHERE sku = ?').get('PA-BLK-101') as {
          id: number;
          name: string;
          sku: string;
          price: number;
          images: string;
        };

        if (firstProd && secondProd) {
          const orderNum = 'PA-2026-1001';
          const addrSnap = JSON.stringify({
            full_name: 'Claire Bennett',
            phone: '+1 (555) 391-4420',
            line1: '418 Waverly Place',
            line2: 'Suite 3B',
            city: 'New York',
            state: 'NY',
            postal_code: '10014',
            country: 'United States',
          });
          const ordRes = db
            .prepare(
              `INSERT INTO orders (
                order_number, user_id, customer_name, customer_email, customer_phone,
                shipping_address_snapshot, subtotal, discount_total, delivery_charge,
                final_total, payment_method, payment_status, order_status, notes
              ) VALUES (?, ?, 'Claire Bennett', ?, '+1 (555) 391-4420', ?, 186, 10, 0, 176, 'demo_online', 'paid', 'Delivered', 'Gift wrap requested')`
            )
            .run(orderNum, customerId, demoEmail, addrSnap);
          const orderId = Number(ordRes.lastInsertRowid);

          db.prepare(
            `INSERT INTO order_items (order_id, product_id, product_name_snapshot, product_sku_snapshot, product_image_snapshot, unit_price, unit_discount_price, quantity, line_total)
             VALUES (?, ?, ?, ?, ?, 68, 58, 1, 58)`
          ).run(orderId, firstProd.id, firstProd.name, firstProd.sku, JSON.parse(firstProd.images)[0] || '');

          db.prepare(
            `INSERT INTO order_items (order_id, product_id, product_name_snapshot, product_sku_snapshot, product_image_snapshot, unit_price, unit_discount_price, quantity, line_total)
             VALUES (?, ?, ?, ?, ?, 118, NULL, 1, 118)`
          ).run(orderId, secondProd.id, secondProd.name, secondProd.sku, JSON.parse(secondProd.images)[0] || '');

          db.prepare(
            `INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, currency, status)
             VALUES (?, 'demo_online', 'demo_ord_seed_1001', 'demo_pay_seed_1001', 176, 'USD', 'paid')`
          ).run(orderId);
        }
      }
    }
  });

  seedTx();
}
