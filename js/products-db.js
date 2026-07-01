// ============================================
// DINGQI - Product Catalog Database Module
// ============================================
// Loads categories / series / products from Supabase and
// provides admin CRUD helpers.
// ============================================

const Catalog = {
  _data: null,
  _listeners: [],

  // Admin helpers
  _adminNamePattern: /^admin\d*-dingqi\d*$/i,
  isAdmin(name) {
    return this._adminNamePattern.test(name || '');
  },

  // Convert flat DB rows into the old productData shape
  _buildCatalog(categories, series, products) {
    const seriesByCat = {};
    series.forEach(s => {
      if (!seriesByCat[s.category_id]) seriesByCat[s.category_id] = [];
      seriesByCat[s.category_id].push(s);
    });

    const productsBySeries = {};
    products.forEach(p => {
      if (!productsBySeries[p.series_id]) productsBySeries[p.series_id] = [];
      productsBySeries[p.series_id].push(p);
    });

    return categories
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(cat => ({
        id: cat.id,
        categoryName: cat.name,
        gradient: cat.gradient,
        series: (seriesByCat[cat.id] || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(ser => ({
            id: ser.id,
            name: ser.name,
            desc: ser.description || '',
            cover: ser.cover_image,
            category_id: ser.category_id,
            models: (productsBySeries[ser.id] || [])
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(p => ({
                id: p.product_id,
                name: p.name,
                realImg: p.real_image,
                lineImg: p.line_image,
                params: Array.isArray(p.params) ? p.params : [],
                colors: Array.isArray(p.colors) ? p.colors : [],
                accessories: Array.isArray(p.accessories) ? p.accessories : [],
                installation_method: p.installation_method,
                options_text: p.options_text,
                db_id: p.id,
                series_id: p.series_id
              }))
          }))
      }));
  },

  async load() {
    const db = getSupabase();
    if (!db) {
      console.warn('Supabase not configured; using local product data.');
      this._data = this._localFallback();
      this._notify();
      return this._data;
    }

    try {
      const [catResp, serResp, prodResp] = await Promise.all([
        db.from('categories').select('*').order('sort_order', { ascending: true }),
        db.from('series').select('*').order('sort_order', { ascending: true }),
        db.from('products').select('*').order('sort_order', { ascending: true })
      ]);

      if (catResp.error || serResp.error || prodResp.error) {
        console.error('Catalog load error:', catResp.error || serResp.error || prodResp.error);
        this._data = this._localFallback();
        this._notify();
        return this._data;
      }

      // If Supabase has no data, fall back to local
      if (!catResp.data || catResp.data.length === 0) {
        console.info('Supabase catalog empty; using local product data.');
        this._data = this._localFallback();
        this._notify();
        return this._data;
      }

      this._data = this._buildCatalog(catResp.data, serResp.data, prodResp.data);
      this._notify();
      return this._data;
    } catch (err) {
      console.error('Catalog load exception:', err);
      this._data = this._localFallback();
      this._notify();
      return this._data;
    }
  },

  // Fall back to local productData (from product-data.js)
  _localFallback() {
    if (typeof productData === 'undefined') return [];
    const gradients = [
      'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      'linear-gradient(135deg, #2d1b2e 0%, #1a1a2e 50%, #162447 100%)',
      'linear-gradient(135deg, #1a2a1a 0%, #162d16 50%, #0f340f 100%)',
      'linear-gradient(135deg, #2a1a1a 0%, #2d1616 50%, #340f0f 100%)'
    ];
    return productData.map((cat, ci) => ({
      id: 'local-cat-' + ci,
      categoryName: cat.categoryName,
      gradient: gradients[ci] || '',
      series: cat.series.map((ser, si) => ({
        id: 'local-ser-' + ci + '-' + si,
        name: ser.name,
        desc: ser.desc || '',
        cover: ser.models?.[0]?.realImg || '',
        models: ser.models.map((m, mi) => ({
          id: m.id,
          name: m.name,
          realImg: m.realImg,
          lineImg: m.lineImg,
          params: m.params || [],
          colors: m.colors || [],
          accessories: m.accessories || [],
          installation_method: (m.params || []).find(p => p.label.toLowerCase().includes('mounting'))?.value || '',
          options_text: (m.params || []).find(p => p.label.toLowerCase().includes('options'))?.value || '',
          db_id: null,
          series_id: 'local-ser-' + ci + '-' + si
        }))
      }))
    }));
  },

  get data() {
    return this._data || [];
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    this._listeners.forEach(fn => fn(this._data));
  },

  // ═══════════════════════════════════
  //  Categories (大分类)
  // ═══════════════════════════════════

  async addCategory({ name, gradient }) {
    const db = getSupabase();
    const { count } = await db.from('categories').select('*', { count: 'exact', head: true });
    const { data, error } = await db.from('categories').insert({
      name,
      gradient: gradient || '',
      sort_order: count || 0
    }).select().single();
    if (error) throw error;
    await this.load();
    return data;
  },

  async updateCategory(id, { name, gradient }) {
    const db = getSupabase();
    const { data, error } = await db.from('categories').update({ name, gradient }).eq('id', id).select().single();
    if (error) throw error;
    await this.load();
    return data;
  },

  async deleteCategory(id) {
    const db = getSupabase();
    const { error } = await db.from('categories').delete().eq('id', id);
    if (error) throw error;
    await this.load();
  },

  // ═══════════════════════════════════
  //  Series (子分类)
  // ═══════════════════════════════════

  async addSeries({ category_id, name, description, cover_image }) {
    const db = getSupabase();
    const { count } = await db.from('series').select('*', { count: 'exact', head: true }).eq('category_id', category_id);
    const { data, error } = await db.from('series').insert({
      category_id,
      name,
      description: description || '',
      cover_image: cover_image || '',
      sort_order: count || 0
    }).select().single();
    if (error) throw error;
    await this.load();
    return data;
  },

  async updateSeries(id, { name, description, cover_image }) {
    const db = getSupabase();
    const { data, error } = await db.from('series').update({ name, description, cover_image }).eq('id', id).select().single();
    if (error) throw error;
    await this.load();
    return data;
  },

  async deleteSeries(id) {
    const db = getSupabase();
    const { error } = await db.from('series').delete().eq('id', id);
    if (error) throw error;
    await this.load();
  },

  // ═══════════════════════════════════
  //  Products (产品)
  // ═══════════════════════════════════

  async addProduct({ series_id, product_id, name, real_image, line_image, params, colors, accessories, installation_method, options_text }) {
    const db = getSupabase();
    const { count } = await db.from('products').select('*', { count: 'exact', head: true }).eq('series_id', series_id);
    const { data, error } = await db.from('products').insert({
      series_id,
      product_id: product_id || name,
      name,
      real_image: real_image || '',
      line_image: line_image || '',
      params: params || [],
      colors: colors || [],
      accessories: accessories || [],
      installation_method: installation_method || '',
      options_text: options_text || '',
      sort_order: count || 0
    }).select().single();
    if (error) throw error;
    await this.load();

    // Notify subscribers about the new product
    this._notifySubscribers(name, product_id || name, series_id);

    return data;
  },

  async updateProduct(id, payload) {
    const db = getSupabase();
    const { data, error } = await db.from('products').update(payload).eq('id', id).select().single();
    if (error) throw error;
    await this.load();
    return data;
  },

  async deleteProduct(id) {
    const db = getSupabase();
    const { error } = await db.from('products').delete().eq('id', id);
    if (error) throw error;
    await this.load();
  },

  // Send email notification to all subscribers when a new product is added
  async _notifySubscribers(productName, productId, seriesId) {
    if (SUPABASE_URL.includes('YOUR-PROJECT-ID')) return;

    // Look up series name from local cache
    let seriesName = '';
    if (this._data) {
      for (const cat of this._data) {
        for (const ser of cat.series) {
          if (ser.id === seriesId) { seriesName = ser.name; break; }
          for (const m of ser.models) {
            if (m.series_id === seriesId) { seriesName = ser.name; break; }
          }
        }
      }
    }

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/product-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: productName,
          product_id: productId,
          series_name: seriesName,
          product_url: `https://dingqilighting.com/pages/product-detail.html?id=${productId}`
        })
      });
    } catch (e) {
      console.warn('Failed to send product notification:', e);
    }
  },

  // Image upload to Supabase Storage (optional helper)
  async uploadImage(file, bucket = 'product-images') {
    const db = getSupabase();
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await db.storage.from(bucket).upload(filename, file, { upsert: false });
    if (error) {
      // Try to create bucket if missing
      if (error.message?.includes('bucket') || error.message?.includes('not found')) {
        await db.rpc('create_storage_bucket', { bucket_name: bucket });
        const retry = await db.storage.from(bucket).upload(filename, file, { upsert: false });
        if (retry.error) throw retry.error;
        return this._publicUrl(bucket, retry.data.path);
      }
      throw error;
    }
    return this._publicUrl(bucket, data.path);
  },

  _publicUrl(bucket, path) {
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  }
};

// Make it globally available for legacy scripts
window.Catalog = Catalog;
