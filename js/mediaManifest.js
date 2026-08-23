(function() {
  'use strict';

  var entityImages = {
    '先驱-深岩熔核': ['img/entities/先驱-深岩熔核.gif'],
    '先驱-苍岭战兽': ['img/entities/先驱-苍岭战兽.gif'],
    '卫道士': ['img/entities/卫道士.gif'],
    '咒贤-贝杜阿汗': ['img/entities/咒贤-贝杜阿汗.gif'],
    '奎尔-虚空侵蚀': ['img/entities/奎尔-虚空侵蚀.gif'],
    '掘进者': ['img/entities/掘进者.png'],
    '掠夺者': ['img/entities/掠夺者.gif', 'img/entities/掠夺者_1.gif'],
    '熔岩戍卫': ['img/entities/熔岩戍卫.gif'],
    '百战精锐': ['img/entities/百战精锐.gif'],
    '矿工骷髅': ['img/entities/矿工骷髅.gif'],
    '神秘商人': ['img/entities/神秘商人.gif'],
    '窃魂者精锐骷髅': ['img/entities/窃魂者精锐骷髅.gif', 'img/entities/窃魂者精锐骷髅_1.gif'],
    '窃魂者骷髅': ['img/entities/窃魂者骷髅.gif'],
    '维利人流浪商人': ['img/entities/维利人流浪商人.gif'],
    '蘑菇人': ['img/entities/蘑菇人.gif'],
    '红菇猎手': ['img/entities/红菇猎手.gif', 'img/entities/红菇猎手_1.gif'],
    '蘑菇爷爷': ['img/entities/蘑菇爷爷.gif', 'img/entities/蘑菇爷爷_1.gif'],
    '鱼头渔夫': ['img/entities/鱼头渔夫.gif']
  };
  var thumbnails = {};
  Object.keys(entityImages).forEach(function(name) {
    thumbnails[name] = 'img/entities/thumbnails/' + name + '.webp';
  });
  var modelFiles = [
    '北风前哨站.glb',
    '海潮镇.glb',
    '熔岩遗迹.glb',
    '铁群岛.glb',
    '北风前哨站.preview.glb',
    '海潮镇.preview.glb',
    '熔岩遗迹.preview.glb',
    '铁群岛.preview.glb'
  ];
  var modelPreviews = {
    '北风前哨站.glb': '北风前哨站.preview.glb',
    '海潮镇.glb': '海潮镇.preview.glb',
    '熔岩遗迹.glb': '熔岩遗迹.preview.glb',
    '铁群岛.glb': '铁群岛.preview.glb'
  };

  window.TDE_MEDIA = Object.freeze({
    entityImages: Object.freeze(entityImages),
    thumbnails: Object.freeze(thumbnails),
    modelFiles: Object.freeze(modelFiles),
    modelPreviews: Object.freeze(modelPreviews)
  });
})();
